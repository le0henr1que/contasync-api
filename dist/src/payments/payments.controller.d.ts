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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    getMyPayment(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    uploadMyReceipt(id: string, file: Express.Multer.File, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    findAll(queryDto: QueryPaymentsDto, req: any): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        totalSum: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    findOne(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    create(createPaymentDto: CreatePaymentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    update(id: string, updatePaymentDto: UpdatePaymentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    uploadReceipt(id: string, file: Express.Multer.File, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    delete(id: string, req: any): Promise<{
        message: string;
    }>;
    getRecurringPayments(req: any): Promise<({
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
            amount: import("@prisma/client-runtime-utils").Decimal;
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    cancelRecurrence(id: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    attachDocument(id: string, attachDocumentDto: AttachDocumentDto, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
    detachDocument(id: string, documentId: string, req: any): Promise<{
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
        amount: import("@prisma/client-runtime-utils").Decimal;
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
