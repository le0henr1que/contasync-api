"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentFoldersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DocumentFoldersService = class DocumentFoldersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    DEFAULT_FOLDERS = [
        {
            name: 'Notas Fiscais',
            type: client_1.FolderType.NOTAS_FISCAIS,
            icon: '🧾',
            color: '#3b82f6',
            description: 'Notas fiscais de entrada e saída',
            isDefault: true,
            sortOrder: 1,
        },
        {
            name: 'Contratos',
            type: client_1.FolderType.CONTRATOS,
            icon: '📄',
            color: '#8b5cf6',
            description: 'Contratos e acordos',
            isDefault: true,
            sortOrder: 2,
        },
        {
            name: 'Declarações',
            type: client_1.FolderType.DECLARACOES,
            icon: '📋',
            color: '#10b981',
            description: 'Declarações fiscais e contábeis',
            isDefault: true,
            sortOrder: 3,
        },
        {
            name: 'Comprovantes',
            type: client_1.FolderType.COMPROVANTES,
            icon: '🧾',
            color: '#f59e0b',
            description: 'Comprovantes de pagamento',
            isDefault: true,
            sortOrder: 4,
        },
        {
            name: 'Balancetes',
            type: client_1.FolderType.BALANCETES,
            icon: '📊',
            color: '#06b6d4',
            description: 'Balancetes e demonstrativos contábeis',
            isDefault: true,
            sortOrder: 5,
        },
        {
            name: 'Outros',
            type: client_1.FolderType.OUTROS,
            icon: '📁',
            color: '#64748b',
            description: 'Outros documentos diversos',
            isDefault: true,
            sortOrder: 6,
        },
    ];
    async createDefaultFolders(clientId) {
        return this.prisma.$transaction(this.DEFAULT_FOLDERS.map((folder) => this.prisma.documentFolder.create({
            data: {
                ...folder,
                clientId,
            },
        })));
    }
    async findAllByClient(clientId, queryDto) {
        const { includeEmpty = true } = queryDto;
        const folders = await this.prisma.documentFolder.findMany({
            where: { clientId },
            include: {
                _count: {
                    select: { documents: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        return includeEmpty
            ? folders
            : folders.filter((folder) => folder._count.documents > 0);
    }
    async create(createFolderDto, clientId) {
        const existingDefault = await this.prisma.documentFolder.findFirst({
            where: {
                clientId,
                type: createFolderDto.type,
                isDefault: true,
            },
        });
        if (existingDefault) {
            throw new common_1.BadRequestException('Já existe uma pasta padrão deste tipo. Use a pasta existente ou escolha outro tipo.');
        }
        return this.prisma.documentFolder.create({
            data: {
                ...createFolderDto,
                clientId,
            },
        });
    }
    async update(id, updateFolderDto, clientId) {
        const folder = await this.prisma.documentFolder.findFirst({
            where: { id, clientId },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Pasta não encontrada');
        }
        if (folder.isDefault && updateFolderDto.type) {
            throw new common_1.BadRequestException('Não é possível alterar o tipo de pastas padrão');
        }
        return this.prisma.documentFolder.update({
            where: { id },
            data: updateFolderDto,
        });
    }
    async remove(id, clientId) {
        const folder = await this.prisma.documentFolder.findFirst({
            where: { id, clientId },
            include: {
                _count: { select: { documents: true } },
            },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Pasta não encontrada');
        }
        if (folder.isDefault && folder._count.documents > 0) {
            throw new common_1.BadRequestException('Não é possível remover pastas padrão que contêm documentos');
        }
        if (folder._count.documents > 0) {
            const otherFolder = await this.prisma.documentFolder.findFirst({
                where: {
                    clientId,
                    type: client_1.FolderType.OUTROS,
                    isDefault: true,
                },
            });
            if (!otherFolder) {
                throw new common_1.BadRequestException('Pasta "Outros" não encontrada. Não é possível mover os documentos.');
            }
            await this.prisma.document.updateMany({
                where: { folderId: id },
                data: { folderId: otherFolder.id },
            });
        }
        return this.prisma.documentFolder.delete({
            where: { id },
        });
    }
};
exports.DocumentFoldersService = DocumentFoldersService;
exports.DocumentFoldersService = DocumentFoldersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentFoldersService);
//# sourceMappingURL=document-folders.service.js.map