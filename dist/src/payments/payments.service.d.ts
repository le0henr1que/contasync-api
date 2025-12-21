import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LimitsService } from '../limits/limits.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Prisma } from '@prisma/client';
export declare class PaymentsService {
    private prisma;
    private emailService;
    private limitsService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService, limitsService: LimitsService);
    findAll(queryDto: QueryPaymentsDto, accountantId: string): Promise<{
        payments: ({
            client: {
                user: {
                    name: string;
                    id: string;
                    email: string;
                };
                id: string;
                companyName: string;
            };
            attachedDocuments: ({
                document: {
                    id: string;
                    title: string;
                    fileName: string;
                    mimeType: string;
                    fileSize: number;
                };
            } & {
                id: string;
                paymentId: string;
                documentId: string;
                attachedAt: Date;
                attachedBy: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            accountantId: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            clientId: string | null;
            title: string;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            dueDate: Date;
            notes: string | null;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            receiptPath: string | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | Prisma.Decimal;
    }>;
    findOne(id: string, accountantId: string): Promise<{
        accountant: {
            id: string;
            companyName: string;
        };
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    name: string;
                    id: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                clientId: string;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                title: string;
                filePath: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                createdById: string;
            };
        } & {
            id: string;
            paymentId: string;
            documentId: string;
            attachedAt: Date;
            attachedBy: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    create(createPaymentDto: CreatePaymentDto, accountantId: string): Promise<{
        accountant: {
            id: string;
            companyName: string;
        };
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    update(id: string, updatePaymentDto: UpdatePaymentDto, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    uploadReceipt(id: string, file: Express.Multer.File, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    private calculatePaymentStatus;
    getStatistics(accountantId: string): Promise<{
        count: {
            total: number;
            paid: number;
            pending: number;
            overdue: number;
            canceled: number;
        };
        amount: {
            total: number | Prisma.Decimal;
            paid: number | Prisma.Decimal;
            pending: number | Prisma.Decimal;
            overdue: number | Prisma.Decimal;
        };
    }>;
    updatePaymentStatuses(): Promise<void>;
    processRecurringPayments(): Promise<void>;
    getClientByUserId(userId: string): Promise<{
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
    findAllForClient(queryDto: QueryPaymentsDto, clientId: string): Promise<{
        payments: ({
            client: {
                user: {
                    name: string;
                    id: string;
                    email: string;
                };
                id: string;
                companyName: string;
            };
            attachedDocuments: ({
                document: {
                    id: string;
                    title: string;
                    fileName: string;
                    mimeType: string;
                    fileSize: number;
                };
            } & {
                id: string;
                paymentId: string;
                documentId: string;
                attachedAt: Date;
                attachedBy: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            accountantId: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            clientId: string | null;
            title: string;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            dueDate: Date;
            notes: string | null;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            receiptPath: string | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        totalSum: number | Prisma.Decimal;
    }>;
    findOneForClient(id: string, clientId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    name: string;
                    id: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                clientId: string;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                title: string;
                filePath: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                createdById: string;
            };
        } & {
            id: string;
            paymentId: string;
            documentId: string;
            attachedAt: Date;
            attachedBy: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    uploadReceiptForClient(id: string, file: Express.Multer.File, clientId: string): Promise<{
        client: {
            user: {
                name: string;
                email: string;
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    delete(id: string, accountantId: string): Promise<{
        message: string;
    }>;
    findRecurringPayments(accountantId: string): Promise<({
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
        childPayments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            accountantId: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            clientId: string | null;
            title: string;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            dueDate: Date;
            notes: string | null;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            receiptPath: string | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    })[]>;
    cancelRecurrence(paymentId: string, accountantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    attachDocument(paymentId: string, documentId: string, userId: string, accountantId: string): Promise<{
        accountant: {
            id: string;
            companyName: string;
        };
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    name: string;
                    id: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                clientId: string;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                title: string;
                filePath: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                createdById: string;
            };
        } & {
            id: string;
            paymentId: string;
            documentId: string;
            attachedAt: Date;
            attachedBy: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
    detachDocument(paymentId: string, documentId: string, accountantId: string): Promise<{
        accountant: {
            id: string;
            companyName: string;
        };
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    name: string;
                    id: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                clientId: string;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                title: string;
                filePath: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                createdById: string;
            };
        } & {
            id: string;
            paymentId: string;
            documentId: string;
            attachedAt: Date;
            attachedBy: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        accountantId: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        clientId: string | null;
        title: string;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        dueDate: Date;
        notes: string | null;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        receiptPath: string | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
    }>;
}
