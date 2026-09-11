import { io, Socket } from 'socket.io-client';

export interface SocketActivityEvent {
  id: string;
  projectId: string;
  taskId: string | null;
  user: { id: string; name: string; role: string } | null;
  task: { id: string; title: string } | null;
  project: { id: string; name: string } | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
}

export interface PresenceUpdateEvent {
  activeUserCount: number;
  userId: string;
  status: 'online' | 'offline';
  timestamp: string;
}

let socketInstance: Socket | null = null;

export const connectSocket = (accessToken: string): Socket => {
  if (socketInstance) {
    if (socketInstance.auth) {
      socketInstance.auth = { token: `Bearer ${accessToken}` };
    }
    if (socketInstance.disconnected) {
      socketInstance.connect();
    }
    return socketInstance;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || '/';
  socketInstance = io(socketUrl, {
    auth: {
      token: `Bearer ${accessToken}`,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('⚡ Socket connected successfully:', socketInstance?.id);
  });

  socketInstance.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const getSocket = (): Socket | null => {
  return socketInstance;
};

export const joinProjectRoom = (projectId: string, callback?: (res: { success: boolean; message: string }) => void): void => {
  if (socketInstance) {
    socketInstance.emit('join_project_room', { projectId }, callback);
  }
};

export const leaveProjectRoom = (projectId: string): void => {
  if (socketInstance) {
    socketInstance.emit('leave_project_room', { projectId });
  }
};

export const getMissedActivity = (lastSeenActivityAt?: string): void => {
  if (socketInstance) {
    socketInstance.emit('get_missed_activity', { lastSeenActivityAt });
  }
};

export const getActiveUsersCount = (callback: (data: { count: number }) => void): void => {
  if (socketInstance) {
    socketInstance.emit('get_active_users_count', callback);
  }
};
