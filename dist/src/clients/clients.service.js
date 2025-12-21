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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const email_service_1 = require("../email/email.service");
const notifications_service_1 = require("../notifications/notifications.service");
const limits_service_1 = require("../limits/limits.service");
const document_folders_service_1 = require("../document-folders/document-folders.service");
let ClientsService = class ClientsService {
    prisma;
    activityLogService;
    emailService;
    notificationsService;
    limitsService;
    documentFoldersService;
    constructor(prisma, activityLogService, emailService, notificationsService, limitsService, documentFoldersService) {
        this.prisma = prisma;
        this.activityLogService = activityLogService;
        this.emailService = emailService;
        this.notificationsService = notificationsService;
        this.limitsService = limitsService;
        this.documentFoldersService = documentFoldersService;
    }
    async create(createClientDto, accountantId, userId) {
        const limitCheck = await this.limitsService.checkClientLimit(accountantId);
        if (!limitCheck.allowed) {
            const errorMessage = `${limitCheck.message} ${limitCheck.upgradeMessage}`;
            throw new common_1.ForbiddenException({
                message: limitCheck.message,
                upgradeMessage: limitCheck.upgradeMessage,
                suggestedPlans: limitCheck.suggestedPlans,
                usage: limitCheck.usage,
            });
        }
        const existingUserWithEmail = await this.prisma.user.findUnique({
            where: { email: createClientDto.email },
        });
        if (existingUserWithEmail) {
            throw new common_1.ConflictException('Este e-mail já está cadastrado');
        }
        const existingClientWithCpfCnpj = await this.prisma.client.findFirst({
            where: { cpfCnpj: createClientDto.cpfCnpj },
        });
        if (existingClientWithCpfCnpj) {
            throw new common_1.ConflictException('Este CPF/CNPJ já está cadastrado');
        }
        const temporaryPassword = createClientDto.password;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(createClientDto.password, salt);
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                user: {
                    select: { name: true },
                },
            },
        });
        const client = await this.prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    email: createClientDto.email,
                    name: createClientDto.name,
                    passwordHash,
                    role: client_1.Role.CLIENT,
                    isActive: true,
                },
            });
            const newClient = await prisma.client.create({
                data: {
                    userId: user.id,
                    accountantId,
                    cpfCnpj: createClientDto.cpfCnpj,
                    phone: createClientDto.phone,
                    companyName: createClientDto.companyName,
                    expenseModuleEnabled: createClientDto.expenseModuleEnabled || false,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            isActive: true,
                            createdAt: true,
                        },
                    },
                },
            });
            return newClient;
        });
        await this.activityLogService.createLog({
            clientId: client.id,
            userId,
            action: activity_log_service_1.ActivityAction.CLIENT_CREATED,
            description: `Cliente ${createClientDto.name} foi criado`,
            metadata: {
                clientName: createClientDto.name,
                clientEmail: createClientDto.email,
                cpfCnpj: createClientDto.cpfCnpj,
            },
        });
        try {
            await this.documentFoldersService.createDefaultFolders(client.id);
            console.log(`✅ Created default folders for client: ${createClientDto.name}`);
        }
        catch (error) {
            console.error('Failed to create default folders:', error);
        }
        const loginUrl = `${process.env.APP_URL}/login`;
        this.emailService.sendClientInvitation(createClientDto.email, {
            clientName: createClientDto.name,
            accountantName: accountant?.user.name || 'Seu contador',
            loginUrl,
            temporaryPassword,
        }).catch((error) => {
            console.error('Failed to send invitation email:', error);
        });
        return client;
    }
    async findByUserId(userId) {
        const client = await this.prisma.client.findUnique({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        payments: true,
                    },
                },
            },
        });
        if (!client || client.deletedAt) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        return client;
    }
    async findAll(accountantId) {
        return this.prisma.client.findMany({
            where: {
                accountantId,
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        payments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, accountantId) {
        const client = await this.prisma.client.findFirst({
            where: {
                id,
                accountantId,
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        payments: true,
                    },
                },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        return client;
    }
    async update(id, updateClientDto, accountantId, userId) {
        const client = await this.findOne(id, accountantId);
        if (updateClientDto.email && updateClientDto.email !== client.user.email) {
            const existingUserWithEmail = await this.prisma.user.findUnique({
                where: { email: updateClientDto.email },
            });
            if (existingUserWithEmail) {
                throw new common_1.ConflictException('Este e-mail já está cadastrado');
            }
        }
        if (updateClientDto.cpfCnpj && updateClientDto.cpfCnpj !== client.cpfCnpj) {
            const existingClientWithCpfCnpj = await this.prisma.client.findFirst({
                where: {
                    cpfCnpj: updateClientDto.cpfCnpj,
                    id: { not: id }
                },
            });
            if (existingClientWithCpfCnpj) {
                throw new common_1.ConflictException('Este CPF/CNPJ já está cadastrado');
            }
        }
        const changes = [];
        const metadata = {};
        if (updateClientDto.name && updateClientDto.name !== client.user.name) {
            changes.push(`nome alterado de "${client.user.name}" para "${updateClientDto.name}"`);
            metadata.oldName = client.user.name;
            metadata.newName = updateClientDto.name;
        }
        if (updateClientDto.email && updateClientDto.email !== client.user.email) {
            changes.push(`email alterado de "${client.user.email}" para "${updateClientDto.email}"`);
            metadata.oldEmail = client.user.email;
            metadata.newEmail = updateClientDto.email;
        }
        if (updateClientDto.isActive !== undefined && updateClientDto.isActive !== client.user.isActive) {
            const statusText = updateClientDto.isActive ? 'ativado' : 'desativado';
            changes.push(`status do cliente ${statusText}`);
            metadata.statusChanged = true;
            metadata.newStatus = updateClientDto.isActive;
        }
        if (updateClientDto.expenseModuleEnabled !== undefined && updateClientDto.expenseModuleEnabled !== client.expenseModuleEnabled) {
            const moduleText = updateClientDto.expenseModuleEnabled ? 'habilitado' : 'desabilitado';
            changes.push(`módulo de despesas ${moduleText}`);
            metadata.expenseModuleChanged = true;
            metadata.expenseModuleEnabled = updateClientDto.expenseModuleEnabled;
        }
        if (updateClientDto.cpfCnpj && updateClientDto.cpfCnpj !== client.cpfCnpj) {
            changes.push('CPF/CNPJ atualizado');
        }
        if (updateClientDto.phone !== undefined && updateClientDto.phone !== client.phone) {
            changes.push('telefone atualizado');
        }
        if (updateClientDto.companyName !== undefined && updateClientDto.companyName !== client.companyName) {
            changes.push('nome fantasia atualizado');
        }
        const updatedClient = await this.prisma.$transaction(async (prisma) => {
            if (updateClientDto.name || updateClientDto.email || updateClientDto.isActive !== undefined) {
                await prisma.user.update({
                    where: { id: client.userId },
                    data: {
                        ...(updateClientDto.name && { name: updateClientDto.name }),
                        ...(updateClientDto.email && { email: updateClientDto.email }),
                        ...(updateClientDto.isActive !== undefined && { isActive: updateClientDto.isActive }),
                    },
                });
            }
            const updated = await prisma.client.update({
                where: { id },
                data: {
                    ...(updateClientDto.cpfCnpj && { cpfCnpj: updateClientDto.cpfCnpj }),
                    ...(updateClientDto.phone !== undefined && { phone: updateClientDto.phone }),
                    ...(updateClientDto.companyName !== undefined && { companyName: updateClientDto.companyName }),
                    ...(updateClientDto.expenseModuleEnabled !== undefined && { expenseModuleEnabled: updateClientDto.expenseModuleEnabled }),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            isActive: true,
                            createdAt: true,
                        },
                    },
                    _count: {
                        select: {
                            documents: true,
                            payments: true,
                        },
                    },
                },
            });
            return updated;
        });
        if (changes.length > 0) {
            let action = activity_log_service_1.ActivityAction.CLIENT_UPDATED;
            if (metadata.statusChanged) {
                action = activity_log_service_1.ActivityAction.CLIENT_STATUS_CHANGED;
            }
            else if (metadata.expenseModuleChanged) {
                action = activity_log_service_1.ActivityAction.CLIENT_EXPENSE_MODULE_TOGGLED;
            }
            await this.activityLogService.createLog({
                clientId: id,
                userId,
                action,
                description: `Cliente ${updatedClient.user.name}: ${changes.join(', ')}`,
                metadata,
            });
        }
        return updatedClient;
    }
    async remove(id, accountantId, userId) {
        const client = await this.findOne(id, accountantId);
        await this.prisma.$transaction(async (prisma) => {
            await prisma.client.update({
                where: { id: client.id },
                data: { deletedAt: new Date() },
            });
            await prisma.user.update({
                where: { id: client.userId },
                data: { deletedAt: new Date(), isActive: false },
            });
        });
        await this.activityLogService.createLog({
            clientId: id,
            userId,
            action: activity_log_service_1.ActivityAction.CLIENT_DELETED,
            description: `Cliente ${client.user.name} foi deletado`,
            metadata: {
                clientName: client.user.name,
                clientEmail: client.user.email,
                cpfCnpj: client.cpfCnpj,
            },
        });
        return { message: 'Cliente deletado com sucesso' };
    }
    async updateProfile(updateProfileDto, userId) {
        const client = await this.prisma.client.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!client || client.deletedAt) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        if (updateProfileDto.email && updateProfileDto.email !== client.user.email) {
            const existingUserWithEmail = await this.prisma.user.findUnique({
                where: { email: updateProfileDto.email },
            });
            if (existingUserWithEmail) {
                throw new common_1.ConflictException('Este e-mail já está cadastrado');
            }
        }
        const updatedClient = await this.prisma.$transaction(async (prisma) => {
            if (updateProfileDto.name || updateProfileDto.email) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        ...(updateProfileDto.name && { name: updateProfileDto.name }),
                        ...(updateProfileDto.email && { email: updateProfileDto.email }),
                    },
                });
            }
            const updated = await prisma.client.update({
                where: { id: client.id },
                data: {
                    ...(updateProfileDto.phone !== undefined && { phone: updateProfileDto.phone }),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            isActive: true,
                            createdAt: true,
                        },
                    },
                },
            });
            return updated;
        });
        return updatedClient;
    }
    async getStatistics(clientId) {
        const [totalDocuments, pendingDocumentRequests] = await Promise.all([
            this.prisma.document.count({
                where: { clientId, deletedAt: null },
            }),
            this.prisma.documentRequest.count({
                where: { clientId, status: 'PENDING' },
            }),
        ]);
        const [totalPayments, paidPayments, pendingPayments, overduePayments] = await Promise.all([
            this.prisma.payment.count({
                where: { clientId },
            }),
            this.prisma.payment.count({
                where: { clientId, status: 'PAID' },
            }),
            this.prisma.payment.count({
                where: { clientId, status: 'PENDING' },
            }),
            this.prisma.payment.count({
                where: { clientId, status: 'OVERDUE' },
            }),
        ]);
        const paymentsWithoutReceipt = await this.prisma.payment.count({
            where: {
                clientId,
                status: 'PAID',
                receiptPath: null,
            },
        });
        return {
            documents: {
                total: totalDocuments,
                pendingRequests: pendingDocumentRequests,
            },
            payments: {
                total: totalPayments,
                paid: paidPayments,
                pending: pendingPayments,
                overdue: overduePayments,
                withoutReceipt: paymentsWithoutReceipt,
            },
            pendingItems: pendingDocumentRequests + paymentsWithoutReceipt,
        };
    }
    async getAccountantPlan(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                accountant: {
                    include: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                        subscription: {
                            include: {
                                plan: true,
                            },
                        },
                    },
                },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        if (!client.accountant) {
            throw new common_1.NotFoundException('Contador não encontrado');
        }
        const subscription = client.accountant.subscription;
        if (!subscription) {
            return {
                accountantName: client.accountant.user.name,
                plan: {
                    name: 'Sem plano',
                    status: 'EXPIRED',
                    trialEndsAt: null,
                    currentPeriodEnd: null,
                },
            };
        }
        let status = subscription.status;
        let daysRemaining = null;
        if (subscription.trialEnd && subscription.status === 'TRIALING') {
            const now = new Date();
            const trialEnd = new Date(subscription.trialEnd);
            daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        return {
            accountantName: client.accountant.user.name,
            plan: {
                name: subscription.plan?.name || 'Plano Desconhecido',
                status: status,
                trialEndsAt: subscription.trialEnd,
                currentPeriodEnd: subscription.currentPeriodEnd,
                daysRemaining: daysRemaining,
            },
        };
    }
    async getClientUsage(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                accountant: {
                    include: {
                        subscription: {
                            include: {
                                plan: true,
                            },
                        },
                    },
                },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Cliente não encontrado');
        }
        if (!client.accountant) {
            throw new common_1.NotFoundException('Contador não encontrado');
        }
        const subscription = client.accountant.subscription;
        let limits = {
            maxPayments: 500,
            maxExpenses: 1000,
            maxDocuments: 200,
            storageGB: 10,
        };
        if (subscription?.plan?.limitsJson) {
            const planLimits = subscription.plan.limitsJson;
            limits = {
                maxPayments: planLimits.maxPayments || 500,
                maxExpenses: planLimits.maxExpenses || 1000,
                maxDocuments: planLimits.maxDocuments || 200,
                storageGB: planLimits.storageGB || 10,
            };
        }
        const [paymentsCount, expensesCount, documentsData] = await Promise.all([
            this.prisma.payment.count({
                where: { clientId },
            }),
            this.prisma.expense.count({
                where: { clientId },
            }),
            this.prisma.document.aggregate({
                where: { clientId, deletedAt: null },
                _count: true,
                _sum: {
                    fileSize: true,
                },
            }),
        ]);
        const documentsCount = documentsData._count;
        const storageUsedBytes = documentsData._sum.fileSize || 0;
        const storageUsedGB = Number((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2));
        const percentages = {
            payments: Math.round((paymentsCount / limits.maxPayments) * 100),
            expenses: Math.round((expensesCount / limits.maxExpenses) * 100),
            documents: Math.round((documentsCount / limits.maxDocuments) * 100),
            storage: Math.round((storageUsedGB / limits.storageGB) * 100),
        };
        return {
            limits,
            usage: {
                paymentsCount,
                expensesCount,
                documentsCount,
                storageUsedGB,
            },
            percentages,
        };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_log_service_1.ActivityLogService,
        email_service_1.EmailService,
        notifications_service_1.NotificationsService,
        limits_service_1.LimitsService,
        document_folders_service_1.DocumentFoldersService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map