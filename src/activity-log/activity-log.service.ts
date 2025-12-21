import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum ActivityAction {
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  CLIENT_DELETED = 'CLIENT_DELETED',
  CLIENT_STATUS_CHANGED = 'CLIENT_STATUS_CHANGED',
  CLIENT_EXPENSE_MODULE_TOGGLED = 'CLIENT_EXPENSE_MODULE_TOGGLED',
}

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    clientId: string;
    userId: string;
    action: ActivityAction;
    description: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.activityLog.create({
      data: {
        clientId: data.clientId,
        userId: data.userId,
        action: data.action,
        description: data.description,
        metadata: data.metadata || {},
      },
    });
  }

  async getClientActivityLogs(
    clientId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { clientId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({
        where: { clientId },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
