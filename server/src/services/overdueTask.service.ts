import { TaskStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ActivitySocketManager } from '../socket/socket.activity.js';

export interface OverdueJobResult {
  candidateCount: number;
  updatedCount: number;
  timestamp: string;
}

export class OverdueTaskService {
  /**
   * Finds tasks past their due date that are not DONE or OVERDUE,
   * updates their status to OVERDUE, and persists a system ActivityLog entry.
   * Uses optimistic concurrency control and atomic transactions to prevent duplicate logs.
   * Emits Socket.io real-time system events AFTER database transaction succeeds.
   */
  public static async processOverdueTasks(): Promise<OverdueJobResult> {
    const now = new Date();

    // 1. Fetch candidate tasks past due date that are not DONE or OVERDUE
    const candidateTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          not: null,
          lt: now,
        },
        status: {
          notIn: [TaskStatus.DONE, TaskStatus.OVERDUE],
        },
      },
      select: {
        id: true,
        projectId: true,
        status: true,
      },
    });

    let updatedCount = 0;

    // 2. Process each task atomically
    for (const task of candidateTasks) {
      try {
        let createdLog = null;

        await prisma.$transaction(async (tx) => {
          // Optimistic Concurrency Control: Match exact id AND current status
          const updateResult = await tx.task.updateMany({
            where: {
              id: task.id,
              status: task.status,
            },
            data: {
              status: TaskStatus.OVERDUE,
            },
          });

          // Create ActivityLog strictly if status update succeeded
          if (updateResult.count > 0) {
            createdLog = await tx.activityLog.create({
              data: {
                projectId: task.projectId,
                taskId: task.id,
                userId: undefined, // Omitting user ID cleanly represents a system-generated event in DB
                action: 'STATUS_CHANGED',
                previousStatus: task.status,
                newStatus: TaskStatus.OVERDUE,
              },
            });
            updatedCount++;
          }
        });

        // Broadcast system activity event AFTER database transaction succeeds
        if (createdLog) {
          ActivitySocketManager.broadcastActivity({
            id: (createdLog as { id: string }).id,
            projectId: task.projectId,
            taskId: task.id,
            userId: null,
            action: 'STATUS_CHANGED',
            previousStatus: task.status,
            newStatus: TaskStatus.OVERDUE,
            createdAt: (createdLog as { createdAt: Date }).createdAt,
          }).catch((err) => console.error('Failed to broadcast overdue activity event:', err));
        }
      } catch (error) {
        console.error(`Failed to process overdue task ID ${task.id}:`, error);
      }
    }

    return {
      candidateCount: candidateTasks.length,
      updatedCount,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Alias method for processOverdueTasks
   */
  public static async checkAndFlagOverdueTasks(): Promise<{ processedCount: number }> {
    const res = await OverdueTaskService.processOverdueTasks();
    return { processedCount: res.updatedCount };
  }
}
