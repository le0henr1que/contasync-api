import { NotificationType } from '@prisma/client';
export declare class CreateNotificationDto {
    clientId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
}
