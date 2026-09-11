import { Request, Response } from 'express';
import { TaskService } from '../services/task.service.js';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid task creation data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const task = await TaskService.createTask(req.params.projectId, req.user, parseResult.data);
    sendSuccess(res, task, 'Task created successfully', 201);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS' || error.message === 'FORBIDDEN_TASK_CREATION') {
        sendError(res, 'Forbidden: You do not have permission to create tasks in this project', 403, 'FORBIDDEN');
        return;
      }
      if (error.message === 'INVALID_DEVELOPER_ASSIGNMENT') {
        sendError(res, 'Assigned user does not exist or is not a Developer', 400, 'BAD_REQUEST');
        return;
      }
    }
    sendError(res, 'Failed to create task', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getProjectTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const queryParse = taskQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      sendError(res, 'Invalid query filter parameters', 400, 'VALIDATION_ERROR', queryParse.error.issues);
      return;
    }

    const tasks = await TaskService.getProjectTasks(req.params.projectId, req.user, queryParse.data);
    sendSuccess(res, tasks, 'Tasks retrieved successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to view tasks for this project', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to retrieve tasks', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const queryParse = taskQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      sendError(res, 'Invalid query filter parameters', 400, 'VALIDATION_ERROR', queryParse.error.issues);
      return;
    }

    const tasks = await TaskService.getAllTasks(req.user, queryParse.data);
    sendSuccess(res, tasks, 'Tasks retrieved successfully');
  } catch (error: unknown) {
    sendError(res, 'Failed to retrieve tasks', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const task = await TaskService.getTaskById(req.params.id, req.user);
    sendSuccess(res, task, 'Task retrieved successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'TASK_NOT_FOUND') {
        sendError(res, 'Task not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_TASK_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to access this task', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to retrieve task', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid task update data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const task = await TaskService.updateTask(req.params.id, req.user, parseResult.data);
    sendSuccess(res, task, 'Task updated successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'TASK_NOT_FOUND') {
        sendError(res, 'Task not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_TASK_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to update this task', 403, 'FORBIDDEN');
        return;
      }
      if (error.message === 'DEVELOPER_STATUS_ONLY_RESTRICTION') {
        sendError(res, 'Forbidden: Developers can only update task status', 403, 'FORBIDDEN');
        return;
      }
      if (error.message === 'INVALID_DEVELOPER_ASSIGNMENT') {
        sendError(res, 'Assigned user does not exist or is not a Developer', 400, 'BAD_REQUEST');
        return;
      }
    }
    sendError(res, 'Failed to update task', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    await TaskService.deleteTask(req.params.id, req.user);
    sendSuccess(res, null, 'Task deleted successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'TASK_NOT_FOUND') {
        sendError(res, 'Task not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_TASK_ACCESS' || error.message === 'FORBIDDEN_TASK_DELETION') {
        sendError(res, 'Forbidden: You do not have permission to delete this task', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to delete task', 500, 'INTERNAL_SERVER_ERROR');
  }
};
