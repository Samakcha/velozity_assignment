import { UserRole } from '@prisma/client';
import { AuthenticatedSocket } from './socket.auth.js';
import { prisma } from '../config/database.js';

export class RoomManager {
  /**
   * Automatically assigns baseline rooms based on role on connection.
   * - ADMIN: joins 'admin-global' and 'user:<userId>'
   * - PROJECT_MANAGER & DEVELOPER: join 'user:<userId>'
   */
  public static async initializeUserRooms(socket: AuthenticatedSocket): Promise<void> {
    const user = socket.data.user;
    if (!user) return;

    // Join private user room for targeted notifications & developer activity
    await socket.join(`user:${user.id}`);

    // Admins join global admin channel for all activity
    if (user.role === UserRole.ADMIN) {
      await socket.join('admin-global');
    }
  }

  /**
   * Handles explicit requests to join a project room ('project:<projectId>').
   * - ADMIN: Can join any project room.
   * - PROJECT_MANAGER: Allowed ONLY if project.createdById === user.id.
   * - DEVELOPER: Strictly RESTRICTED from joining arbitrary project rooms.
   */
  public static async joinProjectRoom(
    socket: AuthenticatedSocket,
    projectId: string
  ): Promise<{ success: boolean; message: string }> {
    const user = socket.data.user;
    if (!user) {
      return { success: false, message: 'AUTHENTICATION_REQUIRED' };
    }

    if (user.role === UserRole.DEVELOPER) {
      return {
        success: false,
        message: 'FORBIDDEN: Developers cannot join project rooms.',
      };
    }

    if (user.role === UserRole.PROJECT_MANAGER) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdById: true },
      });

      if (!project || project.createdById !== user.id) {
        return {
          success: false,
          message: 'FORBIDDEN: You can only join rooms for projects you created.',
        };
      }
    }

    const roomName = `project:${projectId}`;
    await socket.join(roomName);
    return { success: true, message: `Joined room ${roomName}` };
  }

  public static async leaveProjectRoom(
    socket: AuthenticatedSocket,
    projectId: string
  ): Promise<void> {
    await socket.leave(`project:${projectId}`);
  }
}
