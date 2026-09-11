import { UserRole } from '@prisma/client';
import { prisma } from '../config/database.js';
import { CreateProjectInput, UpdateProjectInput } from '../utils/validation.js';
import { AuthUser } from '../types/express.js';

export class ProjectService {
  public static async createProject(user: AuthUser, data: CreateProjectInput) {
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        createdById: user.id, // Strictly set createdById from authenticated identity
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  public static async getProjects(user: AuthUser) {
    if (user.role === UserRole.ADMIN) {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    if (user.role === UserRole.PROJECT_MANAGER) {
      return prisma.project.findMany({
        where: { createdById: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    // DEVELOPER: Return projects where the developer is assigned at least one task
    return prisma.project.findMany({
      where: {
        tasks: {
          some: { assignedToId: user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  public static async getProjectById(id: string, user: AuthUser) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      throw new Error('PROJECT_NOT_FOUND');
    }

    // Server-side ownership authorization check
    if (user.role === UserRole.PROJECT_MANAGER && project.createdById !== user.id) {
      throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }

    if (user.role === UserRole.DEVELOPER) {
      const isAssigned = project.tasks.some((t) => t.assignedTo?.id === user.id);
      if (!isAssigned) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
      }
    }

    return project;
  }

  public static async updateProject(id: string, user: AuthUser, data: UpdateProjectInput) {
    await this.getProjectById(id, user);

    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!client) {
        throw new Error('CLIENT_NOT_FOUND');
      }
    }

    return prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  public static async deleteProject(id: string, user: AuthUser) {
    if (user.role === UserRole.DEVELOPER) {
      throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }

    const project = await this.getProjectById(id, user);

    return prisma.project.delete({
      where: { id: project.id },
    });
  }
}
