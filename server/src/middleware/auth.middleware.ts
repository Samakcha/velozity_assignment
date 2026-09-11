import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { sendError } from '../utils/apiResponse.js';
import { prisma } from '../config/database.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token missing or malformed', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Authentication token missing', 401, 'UNAUTHORIZED');
      return;
    }

    const decoded = verifyAccessToken(token);

    // Verify user exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      sendError(res, 'Authenticated user no longer exists', 401, 'UNAUTHORIZED');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    sendError(res, 'Invalid or expired access token', 401, 'UNAUTHORIZED', error);
  }
};
