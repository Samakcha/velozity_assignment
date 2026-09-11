import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token.js';
import { prisma } from '../config/database.js';
import { AuthUser } from '../types/express.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: AuthUser;
  };
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    if (!token || typeof token !== 'string') {
      next(new Error('AUTHENTICATION_ERROR: Token missing'));
      return;
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      next(new Error('AUTHENTICATION_ERROR: User no longer exists'));
      return;
    }

    socket.data.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(new Error('AUTHENTICATION_ERROR: Invalid or expired token'));
  }
};
