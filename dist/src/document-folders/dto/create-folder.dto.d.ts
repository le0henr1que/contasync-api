import { FolderType } from '@prisma/client';
export declare class CreateFolderDto {
    name: string;
    type: FolderType;
    icon?: string;
    color?: string;
    description?: string;
}
