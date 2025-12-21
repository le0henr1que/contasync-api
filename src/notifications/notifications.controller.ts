import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService, NotificationFilters } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationType, Role } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Create a notification for a client
   * POST /api/notifications
   *
   * Only accountants can create notifications for their clients
   */
  @Post()
  @Roles(Role.ACCOUNTANT)
  async createNotification(
    @Request() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(createNotificationDto);
  }

  /**
   * Get unread notifications count
   * GET /api/notifications/unread-count
   */
  @Get('unread-count')
  @Roles('CLIENT')
  async getUnreadCount(@Request() req: any) {
    const clientId = req.user.clientId;
    const count = await this.notificationsService.getUnreadCount(clientId);
    return { count };
  }

  /**
   * Get all notifications for the current client with pagination and filtering
   * GET /api/notifications/me?page=1&limit=20&isRead=false&type=PAYMENT_RECEIVED
   */
  @Get('me')
  @Roles('CLIENT')
  async getMyNotifications(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
  ) {
    const clientId = req.user.clientId;

    const filters: NotificationFilters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }

    if (type) {
      filters.type = type;
    }

    return this.notificationsService.findAllForClient(clientId, filters);
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/mark-all-read
   */
  @Patch('mark-all-read')
  @Roles('CLIENT')
  async markAllAsRead(@Request() req: any) {
    const clientId = req.user.clientId;
    return this.notificationsService.markAllAsRead(clientId);
  }

  /**
   * Mark a notification as read
   * PATCH /api/notifications/:id/read
   */
  @Patch(':id/read')
  @Roles('CLIENT')
  async markAsRead(
    @Param('id') notificationId: string,
    @Request() req: any,
  ) {
    const clientId = req.user.clientId;
    return this.notificationsService.markAsRead(notificationId, clientId);
  }
}
