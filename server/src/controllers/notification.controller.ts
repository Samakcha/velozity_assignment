import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const notifications = await NotificationService.getUserNotifications(req.user.id);
    sendSuccess(res, notifications, 'Notifications retrieved successfully');
  } catch (error: unknown) {
    sendError(res, 'Failed to retrieve notifications', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const unreadCount = await NotificationService.getUnreadCount(req.user.id);
    sendSuccess(res, { unreadCount }, 'Unread count retrieved successfully');
  } catch (error: unknown) {
    sendError(res, 'Failed to retrieve unread count', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const result = await NotificationService.markAsRead(req.user.id, req.params.id);
    sendSuccess(
      res,
      { notification: result.notification, unreadCount: result.unreadCount },
      'Notification marked as read'
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NOTIFICATION_NOT_FOUND') {
      sendError(res, 'Notification not found or access denied', 404, 'NOT_FOUND');
      return;
    }
    sendError(res, 'Failed to mark notification as read', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const result = await NotificationService.markAllAsRead(req.user.id);
    sendSuccess(res, { unreadCount: result.unreadCount }, 'All notifications marked as read');
  } catch (error: unknown) {
    sendError(res, 'Failed to mark notifications as read', 500, 'INTERNAL_SERVER_ERROR');
  }
};
