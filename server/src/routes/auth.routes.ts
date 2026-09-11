import { Router } from 'express';
import { register, login, refresh, logout, me, getDevelopers } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.get('/me', requireAuth, me);
router.get('/developers', requireAuth, getDevelopers);

export default router;
