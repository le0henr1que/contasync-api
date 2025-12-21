import { PaymentsService } from './payments.service';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { AttachDocumentDto } from './dto/attach-document.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    getMyPayments(queryDto: QueryPaymentsDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getMyPayment(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    uploadMyReceipt(id: string, file: Express.Multer.File, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    getStatistics(req: any): Promise<{
        count: {
            total: number;
            paid: number;
            pending: number;
            overdue: number;
            canceled: number;
        };
        amount: {
            total: number | import("@prisma/client-runtime-utils").Decimal;
            paid: number | import("@prisma/client-runtime-utils").Decimal;
            pending: number | import("@prisma/client-runtime-utils").Decimal;
            overdue: number | import("@prisma/client-runtime-utils").Decimal;
        };
    }>;
    findByClient(clientId: string, queryDto: QueryPaymentsDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    findAll(queryDto: QueryPaymentsDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    findOne(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    create(createPaymentDto: CreatePaymentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    update(id: string, updatePaymentDto: UpdatePaymentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    uploadReceipt(id: string, file: Express.Multer.File, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    delete(id: string, req: any): Promise<{
        message: string;
    }>;
    getRecurringPayments(req: any): Promise<({
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    cancelRecurrence(id: string, req: any): Promise<{
        createdAt: Date;
        id: string;
        clientId: string | null;
        accountantId: string;
        paymentType: import("@prisma/client").$Enums.PaymentType;
        title: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    attachDocument(id: string, attachDocumentDto: AttachDocumentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    detachDocument(id: string, documentId: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
