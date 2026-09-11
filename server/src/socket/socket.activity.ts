import { Server } from 'socket.io';
import { UserRole, TaskStatus } from '@prisma/client';
import { AuthenticatedSocket } from './socket.auth.js';
import { prisma } from '../config/database.js';

export interface BroadcastActivityParams {
  id: string;
  projectId: string;
  taskId: string | null;
  userId: string | null;
  action: string;
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  createdAt: Date;
}

export class ActivitySocketManager {
  private static io: Server | null = null;

  public static setIo(io: Server): void {
    this.io = io;
  }

  /**
   * Broadcasts a real-time activity event to authorized rooms/clients:
   * 1. Admin Global Channel ('admin-global')
   * 2. Project Room ('project:<projectId>') for creator PMs
   * 3. Developer Personal Channel ('user:<assignedToId>') for assigned developers
   */
  public static async broadcastActivity(params: BroadcastActivityParams): Promise<void> {
    if (!this.io) {
      console.warn('Socket.io instance not set in ActivitySocketManager');
      return;
    }

    // Fetch related metadata for rich event payload
    const [user, task, project] = await Promise.all([
      params.userId
        ? prisma.user.findUnique({
            where: { id: params.userId },
            select: { id: true, name: true, role: true },
          })
        : null,
      params.taskId
        ? prisma.task.findUnique({
            where: { id: params.taskId },
            select: { id: true, title: true, assignedToId: true },
          })
        : null,
      prisma.project.findUnique({
        where: { id: params.projectId },
        select: { id: true, name: true, createdById: true },
      }),
    ]);

    const payload = {
      id: params.id,
      projectId: params.projectId,
      taskId: params.taskId,
      user: user ? { id: user.id, name: user.name, role: user.role } : null,
      task: task ? { id: task.id, title: task.title } : null,
      project: project ? { id: project.id, name: project.name } : null,
      action: params.action,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      createdAt: params.createdAt.toISOString(),
    };

    // 1. Emit to Admin Global channel
    this.io.to('admin-global').emit('activity_event', payload);

    // 2. Emit to Project Room (Received by Project Manager who created it)
    this.io.to(`project:${params.projectId}`).emit('activity_event', payload);

    // 3. Emit directly to Project Manager Personal Channel (user:<createdById>)
    if (project && project.createdById) {
      this.io.to(`user:${project.createdById}`).emit('activity_event', payload);
    }

    // 4. Emit directly to Developer Personal Channel if task is assigned to a developer
    if (task && task.assignedToId) {
      this.io.to(`user:${task.assignedToId}`).emit('activity_event', payload);
    }
  }

  /**
   * Handles missed event recovery directly from PostgreSQL.
   * Filters by role visibility, fetches last 20 authorized events,
   * and returns them in chronological order (oldest → newest).
   */
  public static async handleMissedActivity(
    socket: AuthenticatedSocket,
    data: { lastSeenActivityAt?: string; limit?: number }
  ): Promise<void> {
    const user = socket.data.user;
    if (!user) return;

    const limit = Math.min(data?.limit || 20, 50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Apply role-based visibility filter in database query
    if (user.role === UserRole.PROJECT_MANAGER) {
      where.project = { createdById: user.id };
    } else if (user.role === UserRole.DEVELOPER) {
      where.task = { assignedToId: user.id };
    }

    if (data?.lastSeenActivityAt) {
      where.createdAt = {
        gt: new Date(data.lastSeenActivityAt),
      };
    }

    // Query PostgreSQL for recent authorized activity
    const missedActivities = await prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Reverse array to return in chronological order (oldest → newest)
    const chronologicalActivities = missedActivities.reverse().map((act) => ({
      id: act.id,
      projectId: act.projectId,
      taskId: act.taskId,
      user: act.user ? { id: act.user.id, name: act.user.name, role: act.user.role } : null,
      task: act.task ? { id: act.task.id, title: act.task.title } : null,
      project: act.project ? { id: act.project.id, name: act.project.name } : null,
      action: act.action,
      previousStatus: act.previousStatus,
      newStatus: act.newStatus,
      createdAt: act.createdAt.toISOString(),
    }));

    socket.emit('missed_activity', {
      activities: chronologicalActivities,
      count: chronologicalActivities.length,
      timestamp: new Date().toISOString(),
    });
  }
}
