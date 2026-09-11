import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import { createTask, getProjectTasks } from '../controllers/task.controller.js';
import { getProjectActivity } from '../controllers/activity.controller.js';

const router = Router();

router.use(requireAuth);

// Project Endpoints
router.post('/', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), updateProject);
router.delete('/:id', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), deleteProject);

// Nested Project Tasks & Activity Endpoints
router.post('/:projectId/tasks', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), createTask);
router.get('/:projectId/tasks', getProjectTasks);
router.get('/:projectId/activity', getProjectActivity);

export default router;
