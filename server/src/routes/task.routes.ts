import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { getAllTasks, getTaskById, updateTask, deleteTask } from '../controllers/task.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), deleteTask);

export default router;
