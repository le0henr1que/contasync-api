import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto, UpdateFolderDto, QueryFoldersDto } from './dto';
export declare class DocumentFoldersService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly DEFAULT_FOLDERS;
    createDefaultFolders(clientId: string): Promise<{
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
    }[]>;
    findAllByClient(clientId: string, queryDto: QueryFoldersDto): Promise<({
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
    create(createFolderDto: CreateFolderDto, clientId: string): Promise<{
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
    update(id: string, updateFolderDto: UpdateFolderDto, clientId: string): Promise<{
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
    remove(id: string, clientId: string): Promise<{
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
