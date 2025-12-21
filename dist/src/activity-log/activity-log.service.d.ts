import { PrismaService } from '../prisma/prisma.service';
export declare enum ActivityAction {
    CLIENT_CREATED = "CLIENT_CREATED",
    CLIENT_UPDATED = "CLIENT_UPDATED",
    CLIENT_DELETED = "CLIENT_DELETED",
    CLIENT_STATUS_CHANGED = "CLIENT_STATUS_CHANGED",
    CLIENT_EXPENSE_MODULE_TOGGLED = "CLIENT_EXPENSE_MODULE_TOGGLED"
}
export declare class ActivityLogService {
    private prisma;
    constructor(prisma: PrismaService);
    createLog(data: {
        clientId: string;
        userId: string;
        action: ActivityAction;
        description: string;
        metadata?: Record<string, any>;
    }): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        userId: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        clientId: string;
        action: string;
    }>;
    getClientActivityLogs(clientId: string, page?: number, limit?: number): Promise<{
        logs: ({
            user: {
                name: string;
                id: string;
                email: string;
                role: import("@prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            description: string;
            createdAt: Date;
            userId: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            clientId: string;
            action: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
