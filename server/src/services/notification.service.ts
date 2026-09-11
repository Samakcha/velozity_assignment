import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { getIo } from '../socket/socket.server.js';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
}

export class NotificationService {
  /**
   * Persists a notification in PostgreSQL first, then emits real-time Socket.io events to user:<userId>.
   * If DB persistence fails, no real-time event is emitted.
   */
  public static async createAndSendNotification(params: CreateNotificationParams) {
    // 1. Persist in PostgreSQL database
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        taskId: params.taskId || null,
        isRead: false,
      },
    });

    // 2. Fetch updated unread count
    const unreadCount = await this.getUnreadCount(params.userId);

    // 3. Emit real-time Socket.io events to target user room (user:<userId>)
    try {
      const io = getIo();
      const payload = {
        id: notification.id,
        userId: notification.userId,
        taskId: notification.taskId,
        type: notification.type,
        message: notification.message,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      };

      io.to(`user:${params.userId}`).emit('notification:new', payload);
      io.to(`user:${params.userId}`).emit('notification:unread_count', { unreadCount });
    } catch (err) {
      console.warn('Socket.io emit warning (user offline or server initializing):', err);
    }

    return notification;
  }

  /**
   * Get authenticated user's notifications ordered newest first.
   */
  public static async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });
  }

  /**
   * Get authenticated user's unread notification count.
   */
  public static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a single notification as read (must belong to authenticated user).
   */
  public static async markAsRead(userId: string, notificationId: string) {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!existing) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const unreadCount = await this.getUnreadCount(userId);

    // Emit updated unread count to user's connected sockets
    try {
      const io = getIo();
      io.to(`user:${userId}`).emit('notification:unread_count', { unreadCount });
    } catch {
      // Ignore if socket not ready
    }

    return { notification: updated, unreadCount };
  }

  /**
   * Mark all unread notifications as read for authenticated user.
   */
  public static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const unreadCount = 0;

    try {
      const io = getIo();
      io.to(`user:${userId}`).emit('notification:unread_count', { unreadCount: 0 });
    } catch {
      // Ignore if socket not ready
    }

    return { unreadCount: 0 };
  }
}
