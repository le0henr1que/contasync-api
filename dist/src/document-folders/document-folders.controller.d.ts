import { DocumentFoldersService } from './document-folders.service';
import { CreateFolderDto, UpdateFolderDto, QueryFoldersDto } from './dto';
export declare class DocumentFoldersController {
    private readonly documentFoldersService;
    constructor(documentFoldersService: DocumentFoldersService);
    findAll(req: any, queryDto: QueryFoldersDto): Promise<({
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
    create(createFolderDto: CreateFolderDto, req: any): Promise<{
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
    }>;
    update(id: string, updateFolderDto: UpdateFolderDto, req: any): Promise<{
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
    }>;
    remove(id: string, req: any): Promise<{
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
    }>;
}
