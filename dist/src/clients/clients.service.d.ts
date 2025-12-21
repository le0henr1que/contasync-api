import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LimitsService } from '../limits/limits.service';
import { DocumentFoldersService } from '../document-folders/document-folders.service';
export declare class ClientsService {
    private prisma;
    private activityLogService;
    private emailService;
    private notificationsService;
    private limitsService;
    private documentFoldersService;
    constructor(prisma: PrismaService, activityLogService: ActivityLogService, emailService: EmailService, notificationsService: NotificationsService, limitsService: LimitsService, documentFoldersService: DocumentFoldersService);
    create(createClientDto: CreateClientDto, accountantId: string, userId: string): Promise<{
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
    findByUserId(userId: string): Promise<{
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
    findAll(accountantId: string): Promise<({
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
    findOne(id: string, accountantId: string): Promise<{
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
    update(id: string, updateClientDto: UpdateClientDto, accountantId: string, userId: string): Promise<{
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
    remove(id: string, accountantId: string, userId: string): Promise<{
        message: string;
    }>;
    updateProfile(updateProfileDto: UpdateProfileDto, userId: string): Promise<{
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
    getStatistics(clientId: string): Promise<{
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
    getAccountantPlan(clientId: string): Promise<{
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
    getClientUsage(clientId: string): Promise<{
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
}
