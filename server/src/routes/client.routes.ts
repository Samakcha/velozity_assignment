import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} from '../controllers/client.controller.js';

const router = Router();

router.use(requireAuth);

// Read endpoints accessible to ADMIN & PM (required for selecting clients in project creation)
router.get('/', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), getClients);
router.get('/:id', requireRole(UserRole.ADMIN, UserRole.PROJECT_MANAGER), getClientById);

// Client management endpoints restricted to ADMIN only
router.post('/', requireRole(UserRole.ADMIN), createClient);
router.put('/:id', requireRole(UserRole.ADMIN), updateClient);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteClient);

export default router;
