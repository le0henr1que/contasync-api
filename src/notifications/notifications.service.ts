import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all notifications for a client with pagination and filtering
   */
  async findAllForClient(clientId: string, filters?: NotificationFilters) {
    const { isRead, type, page = 1, limit = 20 } = filters || {};

    // Build where clause
    const where: any = { clientId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread count for a client
   */
  async getUnreadCount(clientId: string) {
    return this.prisma.notification.count({
      where: {
        clientId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, clientId: string) {
    // First verify the notification exists and belongs to the client
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.clientId !== clientId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta notificação');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a client
   */
  async markAllAsRead(clientId: string) {
    return this.prisma.notification.updateMany({
      where: {
        clientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Create a notification (used by other services)
   */
  async create(data: {
    clientId?: string;
    accountantId?: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    // Must have either clientId or accountantId
    if (!data.clientId && !data.accountantId) {
      throw new Error('Notification must have either clientId or accountantId');
    }

    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * Find all notifications for an accountant with pagination and filtering
   */
  async findAllForAccountant(accountantId: string, filters?: NotificationFilters) {
    const { isRead, type, page = 1, limit = 20 } = filters || {};

    // Build where clause
    const where: any = { accountantId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread count for an accountant
   */
  async getUnreadCountForAccountant(accountantId: string) {
    return this.prisma.notification.count({
      where: {
        accountantId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read (for accountant)
   */
  async markAsReadForAccountant(notificationId: string, accountantId: string) {
    // First verify the notification exists and belongs to the accountant
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.accountantId !== accountantId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta notificação');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for an accountant
   */
  async markAllAsReadForAccountant(accountantId: string) {
    return this.prisma.notification.updateMany({
      where: {
        accountantId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
