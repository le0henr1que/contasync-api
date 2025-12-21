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
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let InvitationsService = class InvitationsService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async createInvitation(accountantId, createInvitationDto) {
        const { email, name, cpfCnpj } = createInvitationDto;
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Já existe um usuário cadastrado com este email');
        }
        const pendingInvitation = await this.prisma.invitation.findFirst({
            where: {
                accountantId,
                email,
                acceptedAt: null,
                expiresAt: { gte: new Date() },
            },
        });
        if (pendingInvitation) {
            throw new common_1.ConflictException('Já existe um convite pendente para este email');
        }
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: { user: true },
        });
        if (!accountant) {
            throw new common_1.NotFoundException('Contador não encontrado');
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const invitation = await this.prisma.invitation.create({
            data: {
                accountantId,
                email,
                name,
                cpfCnpj,
                token,
                expiresAt,
            },
        });
        const loginUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
        await this.emailService.sendClientInvitation(email, {
            clientName: name,
            accountantName: accountant.user.name,
            loginUrl,
        });
        return {
            message: 'Convite enviado com sucesso',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                name: invitation.name,
                expiresAt: invitation.expiresAt,
            },
        };
    }
    async validateInvitation(token) {
        const invitation = await this.prisma.invitation.findUnique({
            where: { token },
            include: {
                accountant: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Convite não encontrado');
        }
        if (invitation.acceptedAt) {
            throw new common_1.BadRequestException('Este convite já foi aceito');
        }
        if (invitation.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Este convite expirou');
        }
        return {
            email: invitation.email,
            name: invitation.name,
            accountantName: invitation.accountant.user.name,
            expiresAt: invitation.expiresAt,
        };
    }
    async acceptInvitation(acceptInvitationDto) {
        const { token, password } = acceptInvitationDto;
        const invitation = await this.prisma.invitation.findUnique({
            where: { token },
            include: {
                accountant: true,
            },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Convite não encontrado');
        }
        if (invitation.acceptedAt) {
            throw new common_1.BadRequestException('Este convite já foi aceito');
        }
        if (invitation.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Este convite expirou');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await this.prisma.$transaction(async (prisma) => {
            const userName = invitation.name || 'Cliente';
            const userCpfCnpj = invitation.cpfCnpj || '';
            const user = await prisma.user.create({
                data: {
                    name: userName,
                    email: invitation.email,
                    passwordHash,
                    role: client_1.Role.CLIENT,
                    isActive: true,
                },
            });
            const client = await prisma.client.create({
                data: {
                    userId: user.id,
                    accountantId: invitation.accountantId,
                    cpfCnpj: userCpfCnpj,
                },
            });
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                    acceptedAt: new Date(),
                },
            });
            return { user, client };
        });
        return {
            message: 'Convite aceito com sucesso',
            user: {
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role,
            },
        };
    }
    async findAllByAccountant(accountantId) {
        return this.prisma.invitation.findMany({
            where: { accountantId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                cpfCnpj: true,
                expiresAt: true,
                acceptedAt: true,
                createdAt: true,
            },
        });
    }
    async resendInvitation(invitationId, accountantId) {
        const invitation = await this.prisma.invitation.findFirst({
            where: {
                id: invitationId,
                accountantId,
            },
            include: {
                accountant: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Convite não encontrado');
        }
        if (invitation.acceptedAt) {
            throw new common_1.BadRequestException('Este convite já foi aceito');
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.invitation.update({
            where: { id: invitationId },
            data: {
                token,
                expiresAt,
            },
        });
        const loginUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
        await this.emailService.sendClientInvitation(invitation.email, {
            clientName: invitation.name || 'Cliente',
            accountantName: invitation.accountant.user.name,
            loginUrl,
        });
        return {
            message: 'Convite reenviado com sucesso',
        };
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map