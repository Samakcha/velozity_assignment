import { Server as HttpServer } from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { config } from '../config/env.js';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket.auth.js';
import { PresenceManager } from './socket.presence.js';
import { RoomManager } from './socket.rooms.js';
import { ActivitySocketManager } from './socket.activity.js';

let ioInstance: SocketIoServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIoServer => {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new SocketIoServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  // 1. Authentication Middleware
  io.use(socketAuthMiddleware);

  // 2. Set IO reference for activity broadcaster
  ActivitySocketManager.setIo(io);

  // 3. Socket Connection Lifecycle
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    console.log(`🔌 Socket connected: User ${user.email} (${user.role}) [Socket ID: ${socket.id}]`);

    // Handle Presence & Room Setup
    PresenceManager.handleConnect(io, socket);
    await RoomManager.initializeUserRooms(socket);

    // Socket Event Listeners

    // Join Project Room (PM ownership & Admin authorized)
    socket.on('join_project_room', async (data: { projectId: string }, callback) => {
      const result = await RoomManager.joinProjectRoom(socket, data?.projectId);
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Leave Project Room
    socket.on('leave_project_room', async (data: { projectId: string }) => {
      if (data?.projectId) {
        await RoomManager.leaveProjectRoom(socket, data.projectId);
      }
    });

    // Missed Event Recovery from PostgreSQL
    socket.on(
      'get_missed_activity',
      async (data: { lastSeenActivityAt?: string; limit?: number }) => {
        await ActivitySocketManager.handleMissedActivity(socket, data);
      }
    );

    // Active User Count Request
    socket.on('get_active_users_count', (callback) => {
      const count = PresenceManager.getActiveUserCount();
      if (typeof callback === 'function') {
        callback({ count });
      }
    });

    // Disconnect Listener
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: User ${user.email} [Socket ID: ${socket.id}]`);
      PresenceManager.handleDisconnect(io, socket);
    });
  });

  ioInstance = io;
  console.log('⚡ Socket.io server initialized and attached to Express HTTP server.');
  return io;
};

export const getIo = (): SocketIoServer => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return ioInstance;
};
