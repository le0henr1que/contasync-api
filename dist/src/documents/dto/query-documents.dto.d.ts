import { DocumentType } from '@prisma/client';
export declare class QueryDocumentsDto {
    search?: string;
    type?: DocumentType;
    clientId?: string;
    sortBy?: 'createdAt' | 'title' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
