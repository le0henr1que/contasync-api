import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RequestDocumentDto } from './dto/request-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    getMyDocuments(queryDto: QueryDocumentsDto, req: any): Promise<{
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
    getMyDocumentsGrouped(queryDto: QueryDocumentsDto, req: any): Promise<({
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
    uploadClientDocument(file: Express.Multer.File, uploadDto: UploadDocumentDto, req: any): Promise<{
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
    findAll(queryDto: QueryDocumentsDto, req: any): Promise<{
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
    getClientDocumentsGrouped(clientId: string, queryDto: QueryDocumentsDto, req: any): Promise<({
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
    upload(file: Express.Multer.File, uploadDto: UploadDocumentDto, req: any): Promise<{
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
    requestDocument(requestDto: RequestDocumentDto, req: any): Promise<{
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
    getMyDocument(id: string, req: any): Promise<{
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
    downloadMyDocument(id: string, req: any, res: Response): Promise<StreamableFile>;
    findOne(id: string, req: any): Promise<{
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
    download(id: string, req: any, res: Response): Promise<StreamableFile>;
    uploadResponse(file: Express.Multer.File, uploadDto: UploadResponseDto, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
        message: string;
    }>;
}
