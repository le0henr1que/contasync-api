import { DocumentType } from '@prisma/client';
export declare class UploadDocumentDto {
    clientId: string;
    folderId?: string;
    type: DocumentType;
    title?: string;
    description?: string;
}
