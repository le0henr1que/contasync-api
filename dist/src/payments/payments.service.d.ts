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
                id: string;
                companyName: string;
                user: {
                    id: string;
                    email: string;
                    name: string;
                };
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
            createdAt: Date;
            id: string;
            clientId: string | null;
            accountantId: string;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            title: string;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            dueDate: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            notes: string | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            receiptPath: string | null;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
            updatedAt: Date;
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
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        accountant: {
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    id: string;
                    name: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                createdAt: Date;
                id: string;
                clientId: string;
                title: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                updatedAt: Date;
                deletedAt: Date | null;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                description: string | null;
                filePath: string;
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
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    create(createPaymentDto: CreatePaymentDto, accountantId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        accountant: {
            id: string;
            companyName: string;
        };
    } & {
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    update(id: string, updatePaymentDto: UpdatePaymentDto, accountantId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
    } & {
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    uploadReceipt(id: string, file: Express.Multer.File, accountantId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
    } & {
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
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
        createdAt: Date;
        id: string;
        accountantId: string;
        updatedAt: Date;
        userId: string;
        companyName: string | null;
        cpfCnpj: string;
        phone: string | null;
        expenseModuleEnabled: boolean;
        deletedAt: Date | null;
    }>;
    findAllForClient(queryDto: QueryPaymentsDto, clientId: string): Promise<{
        payments: ({
            client: {
                id: string;
                companyName: string;
                user: {
                    id: string;
                    email: string;
                    name: string;
                };
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
            createdAt: Date;
            id: string;
            clientId: string | null;
            accountantId: string;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            title: string;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            dueDate: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            notes: string | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            receiptPath: string | null;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
            updatedAt: Date;
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
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        attachedDocuments: ({
            document: {
                folder: {
                    id: string;
                    name: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                createdAt: Date;
                id: string;
                clientId: string;
                title: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                updatedAt: Date;
                deletedAt: Date | null;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                description: string | null;
                filePath: string;
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
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    uploadReceiptForClient(id: string, file: Express.Multer.File, clientId: string): Promise<{
        client: {
            user: {
                email: string;
                name: string;
            };
        } & {
            createdAt: Date;
            id: string;
            accountantId: string;
            updatedAt: Date;
            userId: string;
            companyName: string | null;
            cpfCnpj: string;
            phone: string | null;
            expenseModuleEnabled: boolean;
            deletedAt: Date | null;
        };
    } & {
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    delete(id: string, accountantId: string): Promise<{
        message: string;
    }>;
    findRecurringPayments(accountantId: string): Promise<({
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        childPayments: {
            createdAt: Date;
            id: string;
            clientId: string | null;
            accountantId: string;
            paymentType: import("@prisma/client").$Enums.PaymentType;
            title: string;
            amount: Prisma.Decimal;
            paymentDate: Date | null;
            dueDate: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            reference: string | null;
            notes: string | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            receiptPath: string | null;
            fileName: string | null;
            mimeType: string | null;
            fileSize: number | null;
            isRecurring: boolean;
            recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
            recurringDayOfMonth: number | null;
            recurringEndDate: Date | null;
            parentPaymentId: string | null;
            requiresInvoice: boolean;
            invoiceAttachedAt: Date | null;
            invoiceAttachedBy: string | null;
            updatedAt: Date;
        }[];
    } & {
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    })[]>;
    cancelRecurrence(paymentId: string, accountantId: string): Promise<{
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    attachDocument(paymentId: string, documentId: string, userId: string, accountantId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        accountant: {
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    id: string;
                    name: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                createdAt: Date;
                id: string;
                clientId: string;
                title: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                updatedAt: Date;
                deletedAt: Date | null;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                description: string | null;
                filePath: string;
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
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
    detachDocument(paymentId: string, documentId: string, accountantId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            user: {
                id: string;
                email: string;
                name: string;
            };
        };
        accountant: {
            id: string;
            companyName: string;
        };
        attachedDocuments: ({
            document: {
                folder: {
                    id: string;
                    name: string;
                    type: import("@prisma/client").$Enums.FolderType;
                    icon: string;
                    color: string;
                };
            } & {
                createdAt: Date;
                id: string;
                clientId: string;
                title: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
                updatedAt: Date;
                deletedAt: Date | null;
                folderId: string | null;
                requestId: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                description: string | null;
                filePath: string;
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
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: Prisma.Decimal;
        paymentDate: Date | null;
        dueDate: Date;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        reference: string | null;
        notes: string | null;
        status: import("@prisma/client").$Enums.PaymentStatus;
        receiptPath: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        isRecurring: boolean;
        recurringFrequency: import("@prisma/client").$Enums.RecurringFrequency | null;
        recurringDayOfMonth: number | null;
        recurringEndDate: Date | null;
        parentPaymentId: string | null;
        requiresInvoice: boolean;
        invoiceAttachedAt: Date | null;
        invoiceAttachedBy: string | null;
        updatedAt: Date;
    }>;
}
