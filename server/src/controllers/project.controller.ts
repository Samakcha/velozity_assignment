import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service.js';
import { createProjectSchema, updateProjectSchema } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid project creation data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const project = await ProjectService.createProject(req.user, parseResult.data);
    sendSuccess(res, project, 'Project created successfully', 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      sendError(res, 'Specified client does not exist', 400, 'BAD_REQUEST');
      return;
    }
    sendError(res, 'Failed to create project', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const projects = await ProjectService.getProjects(req.user);
    sendSuccess(res, projects, 'Projects retrieved successfully');
  } catch (error: unknown) {
    sendError(res, 'Failed to retrieve projects', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const project = await ProjectService.getProjectById(req.params.id, req.user);
    sendSuccess(res, project, 'Project retrieved successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to access this project', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to retrieve project', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid project update data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const project = await ProjectService.updateProject(req.params.id, req.user, parseResult.data);
    sendSuccess(res, project, 'Project updated successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to update this project', 403, 'FORBIDDEN');
        return;
      }
      if (error.message === 'CLIENT_NOT_FOUND') {
        sendError(res, 'Specified client does not exist', 400, 'BAD_REQUEST');
        return;
      }
    }
    sendError(res, 'Failed to update project', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    await ProjectService.deleteProject(req.params.id, req.user);
    sendSuccess(res, null, 'Project deleted successfully');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        sendError(res, 'Project not found', 404, 'NOT_FOUND');
        return;
      }
      if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
        sendError(res, 'Forbidden: You do not have permission to delete this project', 403, 'FORBIDDEN');
        return;
      }
    }
    sendError(res, 'Failed to delete project', 500, 'INTERNAL_SERVER_ERROR');
  }
};
