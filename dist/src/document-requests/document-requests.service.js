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
exports.DocumentRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const email_service_1 = require("../email/email.service");
let DocumentRequestsService = class DocumentRequestsService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async create(createDocumentRequestDto) {
        const client = await this.prisma.client.findUnique({
            where: { id: createDocumentRequestDto.clientId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!client) {
            throw new Error('Cliente não encontrado');
        }
        const documentRequest = await this.prisma.documentRequest.create({
            data: {
                clientId: createDocumentRequestDto.clientId,
                type: createDocumentRequestDto.type,
                description: createDocumentRequestDto.description,
                dueDate: createDocumentRequestDto.dueDate
                    ? new Date(createDocumentRequestDto.dueDate)
                    : null,
                status: client_1.RequestStatus.PENDING,
            },
        });
        const portalUrl = `${process.env.APP_URL}/documentos-solicitados`;
        this.emailService
            .sendDocumentRequest(client.user.email, {
            clientName: client.user.name,
            documentType: createDocumentRequestDto.type,
            deadline: createDocumentRequestDto.dueDate
                ? new Date(createDocumentRequestDto.dueDate).toLocaleDateString('pt-BR')
                : 'Não especificado',
            message: createDocumentRequestDto.description,
            portalUrl,
        })
            .catch((error) => {
            console.error('Failed to send document request email:', error);
        });
        return documentRequest;
    }
    async findClientRequests(clientId) {
        const requests = await this.prisma.documentRequest.findMany({
            where: {
                clientId,
                status: client_1.RequestStatus.PENDING,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return requests;
    }
};
exports.DocumentRequestsService = DocumentRequestsService;
exports.DocumentRequestsService = DocumentRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], DocumentRequestsService);
//# sourceMappingURL=document-requests.service.js.map