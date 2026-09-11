import { UserRole, TaskStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { CreateTaskInput, UpdateTaskInput, TaskQueryInput } from '../utils/validation.js';
import { AuthUser } from '../types/express.js';
import { ProjectService } from './project.service.js';
import { ActivitySocketManager } from '../socket/socket.activity.js';
import { NotificationService } from './notification.service.js';

export class TaskService {
  /**
   * Create a new task within a project.
   * Only ADMIN and Project Manager owning the project can create tasks.
   */
  public static async createTask(projectId: string, user: AuthUser, data: CreateTaskInput) {
    // Verify project access and ownership
    await ProjectService.getProjectById(projectId, user);

    if (user.role === UserRole.DEVELOPER) {
      throw new Error('FORBIDDEN_TASK_CREATION');
    }

    // Verify assigned user is a Developer
    if (data.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedToId },
        select: { id: true, role: true },
      });

      if (!assignedUser || assignedUser.role !== UserRole.DEVELOPER) {
        throw new Error('INVALID_DEVELOPER_ASSIGNMENT');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId,
        assignedToId: data.assignedToId || null,
        status: data.status || TaskStatus.TODO,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Create & emit TASK_ASSIGNED notification AFTER task creation succeeds in DB
    if (data.assignedToId) {
      await NotificationService.createAndSendNotification({
        userId: data.assignedToId,
        type: NotificationType.TASK_ASSIGNED,
        message: `You were assigned Task: '${task.title}'`,
        taskId: task.id,
      });
    }

    // Broadcast TASK_CREATED activity event
    const activity = await prisma.activityLog.create({
      data: {
        projectId,
        taskId: task.id,
        userId: user.id,
        action: 'TASK_CREATED',
        previousStatus: null,
        newStatus: task.status,
      },
    });

    await ActivitySocketManager.broadcastActivity({
      id: activity.id,
      projectId: activity.projectId,
      taskId: activity.taskId,
      userId: activity.userId,
      action: activity.action,
      previousStatus: activity.previousStatus,
      newStatus: activity.newStatus,
      createdAt: activity.createdAt,
    });

    return task;
  }

  /**
   * Get filtered tasks for a project.
   * Database-level filtering for status, priority, and due date range.
   */
  public static async getProjectTasks(projectId: string, user: AuthUser, query: TaskQueryInput) {
    // Verify project access
    await ProjectService.getProjectById(projectId, user);

    // Build database query filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      projectId,
    };

    // DEVELOPER: Strictly limit query to tasks assigned to themselves
    if (user.role === UserRole.DEVELOPER) {
      where.assignedToId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.dueDateFrom || query.dueDateTo) {
      where.dueDate = {};
      if (query.dueDateFrom) {
        where.dueDate.gte = new Date(query.dueDateFrom);
      }
      if (query.dueDateTo) {
        where.dueDate.lte = new Date(query.dueDateTo);
      }
    }

    return prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get all accessible tasks for the authenticated user across projects.
   * DEVELOPER: Strictly limited to tasks assigned to themselves.
   * PROJECT_MANAGER: Strictly limited to tasks in projects they created.
   * ADMIN: All tasks.
   */
  public static async getAllTasks(user: AuthUser, query: TaskQueryInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (user.role === UserRole.DEVELOPER) {
      where.assignedToId = user.id;
    } else if (user.role === UserRole.PROJECT_MANAGER) {
      where.project = { createdById: user.id };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.dueDateFrom || query.dueDateTo) {
      where.dueDate = {};
      if (query.dueDateFrom) {
        where.dueDate.gte = new Date(query.dueDateFrom);
      }
      if (query.dueDateTo) {
        where.dueDate.lte = new Date(query.dueDateTo);
      }
    }

    return prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get single task details by ID with strict ownership authorization.
   */
  public static async getTaskById(taskId: string, user: AuthUser) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, createdById: true },
        },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!task) {
      throw new Error('TASK_NOT_FOUND');
    }

    // Role Ownership Authorization
    if (user.role === UserRole.PROJECT_MANAGER && task.project.createdById !== user.id) {
      throw new Error('FORBIDDEN_TASK_ACCESS');
    }

    if (user.role === UserRole.DEVELOPER && task.assignedToId !== user.id) {
      throw new Error('FORBIDDEN_TASK_ACCESS');
    }

    return task;
  }

  /**
   * Update task by ID with role-based field restrictions & status change activity logging.
   */
  public static async updateTask(taskId: string, user: AuthUser, data: UpdateTaskInput) {
    const existingTask = await this.getTaskById(taskId, user);

    // DEVELOPER Field Restrictions:
    // Developers can ONLY update the `status` field.
    if (user.role === UserRole.DEVELOPER) {
      const attemptedFields = Object.keys(data).filter(
        (key) => key !== 'status' && data[key as keyof UpdateTaskInput] !== undefined
      );

      if (attemptedFields.length > 0) {
        throw new Error('DEVELOPER_STATUS_ONLY_RESTRICTION');
      }
    }

    // If assignedToId is being changed by PM/Admin, verify target user is a Developer
    if (data.assignedToId && data.assignedToId !== existingTask.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedToId },
        select: { id: true, role: true },
      });

      if (!assignedUser || assignedUser.role !== UserRole.DEVELOPER) {
        throw new Error('INVALID_DEVELOPER_ASSIGNMENT');
      }
    }

    // Determine status change
    const isStatusChanged = data.status && data.status !== existingTask.status;
    const previousStatus = existingTask.status;
    const newStatus = data.status;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Execute update and optional activity log in a database transaction
    const { updatedTask, newActivityLog } = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          project: { select: { id: true, name: true, createdById: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      const actionType = isStatusChanged ? 'STATUS_CHANGED' : 'TASK_UPDATED';
      const activity = await tx.activityLog.create({
        data: {
          projectId: existingTask.projectId,
          taskId: existingTask.id,
          userId: user.id,
          action: actionType,
          previousStatus: previousStatus || null,
          newStatus: newStatus || existingTask.status,
        },
      });

      return { updatedTask: updated, newActivityLog: activity };
    });

    // 1. Broadcast Socket.io activity event AFTER database transaction succeeds
    if (newActivityLog) {
      await ActivitySocketManager.broadcastActivity({
        id: newActivityLog.id,
        projectId: newActivityLog.projectId,
        taskId: newActivityLog.taskId,
        userId: newActivityLog.userId,
        action: newActivityLog.action,
        previousStatus: newActivityLog.previousStatus,
        newStatus: newActivityLog.newStatus,
        createdAt: newActivityLog.createdAt,
      });
    }

    // 2. Trigger TASK_ASSIGNED notification ONLY if newly assigned or reassigned to a different Developer
    const isNewlyAssigned =
      data.assignedToId && data.assignedToId !== existingTask.assignedToId;
    if (isNewlyAssigned) {
      await NotificationService.createAndSendNotification({
        userId: data.assignedToId!,
        type: NotificationType.TASK_ASSIGNED,
        message: `You were assigned Task: '${updatedTask.title}'`,
        taskId: updatedTask.id,
      });
    }

    // 3. Trigger TASK_IN_REVIEW notification ONLY when status transitions from a different status to IN_REVIEW
    const isTransitionedToInReview =
      newStatus === TaskStatus.IN_REVIEW && previousStatus !== TaskStatus.IN_REVIEW;
    if (isTransitionedToInReview) {
      await NotificationService.createAndSendNotification({
        userId: existingTask.project.createdById,
        type: NotificationType.TASK_IN_REVIEW,
        message: `Task '${updatedTask.title}' is now IN_REVIEW`,
        taskId: updatedTask.id,
      });
    }

    return updatedTask;
  }

  /**
   * Delete task by ID.
   * Developers cannot delete tasks. PMs can delete only if they created the project.
   */
  public static async deleteTask(taskId: string, user: AuthUser) {
    if (user.role === UserRole.DEVELOPER) {
      throw new Error('FORBIDDEN_TASK_DELETION');
    }

    await this.getTaskById(taskId, user);

    return prisma.task.delete({
      where: { id: taskId },
    });
  }
}
