import { Server } from 'socket.io';
import { AuthenticatedSocket } from './socket.auth.js';

// Map of userId -> Set of active socket IDs
const userSocketsMap = new Map<string, Set<string>>();

export class PresenceManager {
  public static handleConnect(io: Server, socket: AuthenticatedSocket): void {
    const user = socket.data.user;
    if (!user) return;

    let userSockets = userSocketsMap.get(user.id);
    const isFirstConnection = !userSockets || userSockets.size === 0;

    if (!userSockets) {
      userSockets = new Set<string>();
      userSocketsMap.set(user.id, userSockets);
    }

    userSockets.add(socket.id);

    if (isFirstConnection) {
      this.broadcastPresenceUpdate(io, user.id, 'online');
    }
  }

  public static handleDisconnect(io: Server, socket: AuthenticatedSocket): void {
    const user = socket.data.user;
    if (!user) return;

    const userSockets = userSocketsMap.get(user.id);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        userSocketsMap.delete(user.id);
        this.broadcastPresenceUpdate(io, user.id, 'offline');
      }
    }
  }

  public static getActiveUserCount(): number {
    return userSocketsMap.size;
  }

  public static isUserOnline(userId: string): boolean {
    const sockets = userSocketsMap.get(userId);
    return Boolean(sockets && sockets.size > 0);
  }

  private static broadcastPresenceUpdate(
    io: Server,
    userId: string,
    status: 'online' | 'offline'
  ): void {
    const activeUserCount = this.getActiveUserCount();
    io.emit('presence_update', {
      activeUserCount,
      userId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
