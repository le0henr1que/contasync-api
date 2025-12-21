import { PrismaService } from '../prisma/prisma.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RequestDocumentDto } from './dto/request-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { LimitsService } from '../limits/limits.service';
export declare class DocumentsService {
    private prisma;
    private limitsService;
    constructor(prisma: PrismaService, limitsService: LimitsService);
    findAll(queryDto: QueryDocumentsDto, accountantId: string): Promise<{
        documents: ({
            client: {
                user: {
                    name: string;
                    id: string;
                    email: string;
                };
                id: string;
            };
            createdBy: {
                name: string;
                id: string;
                email: string;
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    upload(uploadDto: UploadDocumentDto, file: Express.Multer.File, userId: string, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
        };
        folder: {
            name: string;
            id: string;
            type: import("@prisma/client").$Enums.FolderType;
            icon: string;
            color: string;
        };
        createdBy: {
            name: string;
            id: string;
            email: string;
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
    }>;
    requestDocument(requestDto: RequestDocumentDto, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.RequestStatus;
        clientId: string;
        type: string;
        dueDate: Date | null;
        fulfilledAt: Date | null;
    }>;
    findOne(id: string, accountantId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
        };
        createdBy: {
            name: string;
            id: string;
            email: string;
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
    }>;
    getDocumentFile(id: string, accountantId: string): Promise<{
        filePath: string;
        fileName: string;
        mimeType: string;
    }>;
    uploadResponse(uploadDto: UploadResponseDto, file: Express.Multer.File, userId: string, clientId: string): Promise<{
        client: {
            user: {
                name: string;
                id: string;
                email: string;
            };
            id: string;
        };
        createdBy: {
            name: string;
            id: string;
            email: string;
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
    }>;
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
    findAllForClient(queryDto: QueryDocumentsDto, clientId: string): Promise<{
        documents: ({
            createdBy: {
                name: string;
                id: string;
                email: string;
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOneForClient(id: string, clientId: string): Promise<{
        createdBy: {
            name: string;
            id: string;
            email: string;
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
    }>;
    getDocumentFileForClient(id: string, clientId: string): Promise<{
        filePath: string;
        fileName: string;
        mimeType: string;
    }>;
    findAllByClientGrouped(clientId: string, queryDto: QueryDocumentsDto): Promise<({
        documents: ({
            paymentAttachments: ({
                payment: {
                    id: string;
                    title: string;
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
        })[];
        _count: {
            documents: number;
        };
    } & {
        name: string;
        id: string;
        description: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        type: import("@prisma/client").$Enums.FolderType;
        icon: string | null;
        color: string | null;
        isDefault: boolean;
    })[]>;
    findAllByClientGroupedForAccountant(clientId: string, accountantId: string, queryDto: QueryDocumentsDto): Promise<({
        documents: ({
            paymentAttachments: ({
                payment: {
                    id: string;
                    title: string;
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
        })[];
        _count: {
            documents: number;
        };
    } & {
        name: string;
        id: string;
        description: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        type: import("@prisma/client").$Enums.FolderType;
        icon: string | null;
        color: string | null;
        isDefault: boolean;
    })[]>;
    delete(id: string, accountantId: string): Promise<{
        message: string;
    }>;
}
