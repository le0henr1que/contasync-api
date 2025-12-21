import { PrismaService } from '../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { Prisma } from '@prisma/client';
export declare class ExpensesService {
    private prisma;
    private limitsService;
    constructor(prisma: PrismaService, limitsService: LimitsService);
    getClientByUserId(userId: string): Promise<{
        id: string;
        deletedAt: Date;
        expenseModuleEnabled: boolean;
    }>;
    getAccountantByUserId(userId: string): Promise<{
        id: string;
    }>;
    findExpenseById(id: string): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: Prisma.Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    findAllForClient(queryDto: QueryExpensesDto, clientId: string): Promise<{
        expenses: {
            id: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            date: Date;
            amount: Prisma.Decimal;
            receiptPath: string | null;
            category: import("@prisma/client").$Enums.ExpenseCategory;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | Prisma.Decimal;
    }>;
    findOneForClient(id: string, clientId: string): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: Prisma.Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    createForClient(createExpenseDto: CreateExpenseDto, clientId: string, file?: Express.Multer.File): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: Prisma.Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    findAllForAccountant(queryDto: QueryExpensesDto, accountantId: string): Promise<{
        expenses: ({
            client: {
                user: {
                    name: string;
                    email: string;
                };
                id: string;
                companyName: string;
            };
        } & {
            id: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            date: Date;
            amount: Prisma.Decimal;
            receiptPath: string | null;
            category: import("@prisma/client").$Enums.ExpenseCategory;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | Prisma.Decimal;
    }>;
    findOneForAccountant(id: string, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: Prisma.Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    exportToExcel(expenses: any[], clientName?: string): Promise<Buffer>;
    exportToPDF(expenses: any[], clientName?: string): Promise<Buffer>;
    private getCategoryLabel;
    private formatCurrency;
}
