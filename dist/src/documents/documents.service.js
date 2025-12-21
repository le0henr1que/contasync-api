"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const limits_service_1 = require("../limits/limits.service");
let DocumentsService = class DocumentsService {
    prisma;
    limitsService;
    constructor(prisma, limitsService) {
        this.prisma = prisma;
        this.limitsService = limitsService;
    }
    async findAll(queryDto, accountantId) {
        const { search, type, clientId, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, } = queryDto;
        const where = {
            client: {
                accountantId,
                deletedAt: null,
            },
        };
        if (type) {
            where.type = type;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { fileName: { contains: search, mode: 'insensitive' } },
                {
                    client: {
                        user: {
                            name: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            ];
        }
        const skip = (page - 1) * limit;
        const orderBy = {
            [sortBy]: sortOrder,
        };
        const [documents, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.document.count({ where }),
        ]);
        return {
            documents,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async upload(uploadDto, file, userId, accountantId) {
        const limitCheck = await this.limitsService.checkDocumentLimit(uploadDto.clientId);
        if (!limitCheck.allowed) {
            throw new common_1.ForbiddenException({
                message: limitCheck.message,
                upgradeMessage: limitCheck.upgradeMessage,
                usage: limitCheck.usage,
            });
        }
        const client = await this.prisma.client.findFirst({
            where: {
                id: uploadDto.clientId,
                accountantId,
                deletedAt: null,
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        if (uploadDto.folderId) {
            const folder = await this.prisma.documentFolder.findFirst({
                where: {
                    id: uploadDto.folderId,
                    clientId: uploadDto.clientId,
                },
            });
            if (!folder) {
                throw new common_1.BadRequestException('Pasta não encontrada ou não pertence ao cliente');
            }
        }
        const fileExt = path.extname(file.originalname);
        const timestamp = Date.now();
        const uniqueFilename = `${uploadDto.clientId}-${timestamp}${fileExt}`;
        const filePath = path.join('uploads', uniqueFilename);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);
        const document = await this.prisma.document.create({
            data: {
                clientId: uploadDto.clientId,
                folderId: uploadDto.folderId,
                type: uploadDto.type,
                title: uploadDto.title || file.originalname,
                description: uploadDto.description,
                filePath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                createdById: userId,
            },
            include: {
                folder: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        icon: true,
                        color: true,
                    },
                },
                client: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return document;
    }
    async requestDocument(requestDto, accountantId) {
        const client = await this.prisma.client.findFirst({
            where: {
                id: requestDto.clientId,
                accountantId,
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        const dueDate = new Date(requestDto.dueDate);
        if (dueDate <= new Date()) {
            throw new common_1.BadRequestException('Prazo deve ser no futuro');
        }
        const request = await this.prisma.documentRequest.create({
            data: {
                clientId: requestDto.clientId,
                type: requestDto.type,
                description: requestDto.description,
                dueDate,
                status: client_1.RequestStatus.PENDING,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        return request;
    }
    async findOne(id, accountantId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id,
                client: {
                    accountantId,
                    deletedAt: null,
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado');
        }
        return document;
    }
    async getDocumentFile(id, accountantId) {
        const document = await this.findOne(id, accountantId);
        const filePath = path.join(process.cwd(), document.filePath);
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException('Arquivo não encontrado');
        }
        return {
            filePath,
            fileName: document.fileName,
            mimeType: document.mimeType,
        };
    }
    async uploadResponse(uploadDto, file, userId, clientId) {
        const request = await this.prisma.documentRequest.findFirst({
            where: {
                id: uploadDto.requestId,
                clientId,
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitação não encontrada');
        }
        if (request.status !== client_1.RequestStatus.PENDING) {
            throw new common_1.BadRequestException('Esta solicitação já foi atendida');
        }
        const fileExt = path.extname(file.originalname);
        const timestamp = Date.now();
        const uniqueFilename = `${clientId}-${timestamp}${fileExt}`;
        const filePath = path.join('uploads', uniqueFilename);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(process.cwd(), filePath), file.buffer);
        const document = await this.prisma.document.create({
            data: {
                clientId,
                requestId: uploadDto.requestId,
                type: request.type,
                title: file.originalname,
                description: uploadDto.notes,
                filePath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                createdById: userId,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        await this.prisma.documentRequest.update({
            where: { id: uploadDto.requestId },
            data: {
                status: client_1.RequestStatus.FULFILLED,
                fulfilledAt: new Date(),
            },
        });
        return document;
    }
    async getClientByUserId(userId) {
        const client = await this.prisma.client.findUnique({
            where: { userId },
        });
        if (!client || client.deletedAt) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        return client;
    }
    async findAllForClient(queryDto, clientId) {
        const { search, type, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, } = queryDto;
        const where = {
            clientId,
            deletedAt: null,
        };
        if (type) {
            where.type = type;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { fileName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (page - 1) * limit;
        const orderBy = {
            [sortBy]: sortOrder,
        };
        const [documents, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.document.count({ where }),
        ]);
        return {
            documents,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOneForClient(id, clientId) {
        const document = await this.prisma.document.findFirst({
            where: {
                id,
                clientId,
                deletedAt: null,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documento não encontrado');
        }
        return document;
    }
    async getDocumentFileForClient(id, clientId) {
        const document = await this.findOneForClient(id, clientId);
        const filePath = path.join(process.cwd(), document.filePath);
        if (!fs.existsSync(filePath)) {
            throw new common_1.NotFoundException('Arquivo não encontrado');
        }
        return {
            filePath,
            fileName: document.fileName,
            mimeType: document.mimeType,
        };
    }
    async findAllByClientGrouped(clientId, queryDto) {
        const { search, type } = queryDto;
        console.log('🔍 findAllByClientGrouped called with:', { clientId, search, type });
        const folders = await this.prisma.documentFolder.findMany({
            where: { clientId },
            include: {
                documents: {
                    where: {
                        deletedAt: null,
                        ...(search && {
                            OR: [
                                { title: { contains: search, mode: 'insensitive' } },
                                { fileName: { contains: search, mode: 'insensitive' } },
                            ],
                        }),
                        ...(type && { type }),
                    },
                    include: {
                        paymentAttachments: {
                            include: {
                                payment: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { documents: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        console.log(`📁 Found ${folders.length} total folders`);
        const uncategorizedDocs = await this.prisma.document.findMany({
            where: {
                clientId,
                folderId: null,
                deletedAt: null,
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { fileName: { contains: search, mode: 'insensitive' } },
                    ],
                }),
                ...(type && { type }),
            },
            include: {
                paymentAttachments: {
                    include: {
                        payment: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const filteredFolders = folders.filter((folder) => folder.isDefault || folder.documents.length > 0);
        console.log(`✅ After filtering: ${filteredFolders.length} folders (showing defaults + non-empty)`);
        console.log('Filtered folders:', filteredFolders.map(f => ({ name: f.name, isDefault: f.isDefault, docsCount: f.documents.length })));
        if (uncategorizedDocs.length > 0) {
            console.log(`📎 Adding ${uncategorizedDocs.length} uncategorized documents as virtual folder`);
            const uncategorizedFolder = {
                id: 'uncategorized',
                clientId,
                name: 'Sem Pasta',
                type: null,
                icon: '📎',
                color: '#94a3b8',
                description: 'Documentos sem pasta definida',
                isDefault: false,
                sortOrder: 999,
                createdAt: new Date(),
                updatedAt: new Date(),
                documents: uncategorizedDocs,
                _count: { documents: uncategorizedDocs.length },
            };
            filteredFolders.push(uncategorizedFolder);
        }
        console.log(`🎉 Returning ${filteredFolders.length} folders total`);
        return filteredFolders;
    }
    async findAllByClientGroupedForAccountant(clientId, accountantId, queryDto) {
        const client = await this.prisma.client.findFirst({
            where: {
                id: clientId,
                accountantId,
                deletedAt: null,
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        return this.findAllByClientGrouped(clientId, queryDto);
    }
    async delete(id, accountantId) {
        const document = await this.findOne(id, accountantId);
        const filePath = path.join(process.cwd(), document.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        await this.prisma.document.delete({
            where: { id },
        });
        return { message: 'Documento deletado com sucesso' };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        limits_service_1.LimitsService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map