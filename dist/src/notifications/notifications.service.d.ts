import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
export interface NotificationFilters {
    isRead?: boolean;
    type?: NotificationType;
    page?: number;
    limit?: number;
}
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllForClient(clientId: string, filters?: NotificationFilters): Promise<{
        data: {
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            message: string;
            clientId: string;
            type: import("@prisma/client").$Enums.NotificationType;
            title: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(clientId: string): Promise<number>;
    markAsRead(notificationId: string, clientId: string): Promise<{
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        message: string;
        clientId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    markAllAsRead(clientId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    create(data: {
        clientId: string;
        type: NotificationType;
        title: string;
        message: string;
        metadata?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        message: string;
        clientId: string;
        type: import("@prisma/client").$Enums.NotificationType;
        title: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
}
