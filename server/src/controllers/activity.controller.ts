import { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service.js';
import { activityQuerySchema } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getProjectActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const queryParse = activityQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR', queryParse.error.issues);
      return;
    }

    const result = await ActivityService.getProjectActivity(
      req.params.projectId,
      req.user,
      queryParse.data
    );
    sendSuccess(res, result.activities, 'Activity logs retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to view activity for this project', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to retrieve project activity', 500, 'INTERNAL_SERVER_ERROR');
  }
};
