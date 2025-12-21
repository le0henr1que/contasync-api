import type { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    exportMyExpensesToExcel(queryDto: QueryExpensesDto, req: any, res: Response): Promise<void>;
    exportMyExpensesToPDF(queryDto: QueryExpensesDto, req: any, res: Response): Promise<void>;
    exportExpensesToExcel(queryDto: QueryExpensesDto, req: any, res: Response): Promise<void>;
    exportExpensesToPDF(queryDto: QueryExpensesDto, req: any, res: Response): Promise<void>;
    getClientExpenses(clientId: string, queryDto: QueryExpensesDto, tenantId: string): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
            receiptPath: string | null;
            category: import("@prisma/client").$Enums.ExpenseCategory;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getMyExpenses(queryDto: QueryExpensesDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
            receiptPath: string | null;
            category: import("@prisma/client").$Enums.ExpenseCategory;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getMyExpense(id: string, req: any): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    createMyExpense(createExpenseDto: CreateExpenseDto, file: Express.Multer.File, req: any): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        date: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
    downloadReceipt(id: string, req: any, res: Response): Promise<void>;
    getAllExpenses(queryDto: QueryExpensesDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
            receiptPath: string | null;
            category: import("@prisma/client").$Enums.ExpenseCategory;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getExpense(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
        receiptPath: string | null;
        category: import("@prisma/client").$Enums.ExpenseCategory;
    }>;
}
