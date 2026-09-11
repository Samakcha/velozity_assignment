import { UserRole } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthUser } from '../types/express.js';
import { ProjectService } from './project.service.js';
import { ActivityQueryInput } from '../utils/validation.js';

export class ActivityService {
  public static async getProjectActivity(
    projectId: string,
    user: AuthUser,
    query: ActivityQueryInput
  ) {
    // Verify project exists and user has basic project access
    await ProjectService.getProjectById(projectId, user);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      projectId,
    };

    // DEVELOPER: Limit activity logs to tasks assigned to them
    if (user.role === UserRole.DEVELOPER) {
      where.task = {
        assignedToId: user.id,
      };
    }

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
