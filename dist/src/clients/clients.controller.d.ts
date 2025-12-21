import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
export declare class ClientsController {
    private readonly clientsService;
    private readonly activityLogService;
    constructor(clientsService: ClientsService, activityLogService: ActivityLogService);
    getMyProfile(req: any): Promise<{
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        _count: {
            payments: number;
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    }>;
    getMyStatistics(req: any): Promise<{
        documents: {
            total: number;
            pendingRequests: number;
        };
        payments: {
            total: number;
            paid: number;
            pending: number;
            overdue: number;
            withoutReceipt: number;
        };
        pendingItems: number;
    }>;
    getAccountantPlan(req: any): Promise<{
        accountantName: string;
        plan: {
            name: string;
            status: string;
            trialEndsAt: any;
            currentPeriodEnd: any;
            daysRemaining?: undefined;
        };
    } | {
        accountantName: string;
        plan: {
            name: string;
            status: import("@prisma/client").$Enums.SubscriptionStatus;
            trialEndsAt: Date;
            currentPeriodEnd: Date;
            daysRemaining: number;
        };
    }>;
    getMyUsage(req: any): Promise<{
        limits: {
            maxPayments: number;
            maxExpenses: number;
            maxDocuments: number;
            storageGB: number;
        };
        usage: {
            paymentsCount: number;
            expensesCount: number;
            documentsCount: number;
            storageUsedGB: number;
        };
        percentages: {
            payments: number;
            expenses: number;
            documents: number;
            storage: number;
        };
    }>;
    updateMyProfile(updateProfileDto: UpdateProfileDto, req: any): Promise<{
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    }>;
    create(createClientDto: CreateClientDto, req: any): Promise<{
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    }>;
    findAll(req: any): Promise<({
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        _count: {
            payments: number;
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    })[]>;
    findOne(id: string, req: any): Promise<{
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        _count: {
            payments: number;
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    }>;
    update(id: string, updateClientDto: UpdateClientDto, req: any): Promise<{
        user: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        _count: {
            payments: number;
            documents: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        userId: string;
        companyName: string | null;
        phone: string | null;
        deletedAt: Date | null;
        cpfCnpj: string;
        expenseModuleEnabled: boolean;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    getClientActivities(id: string, page: string, limit: string, req: any): Promise<{
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
