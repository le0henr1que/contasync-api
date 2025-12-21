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
exports.LimitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LimitsService = class LimitsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAccountantLimits(accountantId) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
            },
        });
        if (!accountant || !accountant.subscription || !accountant.subscription.plan) {
            return {
                maxClients: 5,
                maxUsers: 2,
                maxPayments: 20,
                maxExpenses: 20,
                maxDocuments: 10,
                storageGB: 0.2,
            };
        }
        const limitsJson = accountant.subscription.plan.limitsJson;
        return {
            maxClients: limitsJson.maxClients,
            maxUsers: limitsJson.maxUsers,
            maxPayments: limitsJson.maxPayments,
            maxExpenses: limitsJson.maxExpenses,
            maxDocuments: limitsJson.maxDocuments,
            storageGB: limitsJson.storageGB,
        };
    }
    async checkClientLimit(accountantId) {
        const limits = await this.getAccountantLimits(accountantId);
        const maxClients = limits.maxClients ?? 0;
        if (maxClients === -1) {
            return {
                allowed: true,
                usage: {
                    current: 0,
                    limit: -1,
                    percentage: 0,
                    isUnlimited: true,
                },
            };
        }
        const currentCount = await this.prisma.client.count({
            where: {
                accountantId,
                deletedAt: null,
            },
        });
        const usage = {
            current: currentCount,
            limit: maxClients,
            percentage: Math.round((currentCount / maxClients) * 100),
            isUnlimited: false,
        };
        if (currentCount >= maxClients) {
            return {
                allowed: false,
                usage,
                message: `Você atingiu o limite de ${maxClients} ${maxClients === 1 ? 'cliente' : 'clientes'} do seu plano atual.`,
                upgradeMessage: `Faça upgrade para adicionar mais clientes e expandir seu escritório.`,
                suggestedPlans: await this.getSuggestedPlans(accountantId, 'clients'),
            };
        }
        return {
            allowed: true,
            usage,
        };
    }
    async checkDocumentLimit(clientId) {
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
            throw new common_1.ForbiddenException('Cliente não encontrado');
        }
        const limitsJson = client.accountant.subscription?.plan?.limitsJson;
        const maxDocuments = limitsJson?.maxDocuments ?? 10;
        if (maxDocuments === -1) {
            return {
                allowed: true,
                usage: {
                    current: 0,
                    limit: -1,
                    percentage: 0,
                    isUnlimited: true,
                },
            };
        }
        const currentCount = await this.prisma.document.count({
            where: {
                clientId,
                deletedAt: null,
            },
        });
        const usage = {
            current: currentCount,
            limit: maxDocuments,
            percentage: Math.round((currentCount / maxDocuments) * 100),
            isUnlimited: false,
        };
        if (currentCount >= maxDocuments) {
            return {
                allowed: false,
                usage,
                message: `Você atingiu o limite de ${maxDocuments} ${maxDocuments === 1 ? 'documento' : 'documentos'} do seu plano.`,
                upgradeMessage: `Entre em contato com seu contador para solicitar um plano com mais capacidade.`,
            };
        }
        return {
            allowed: true,
            usage,
        };
    }
    async checkPaymentLimit(clientId) {
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
            throw new common_1.ForbiddenException('Cliente não encontrado');
        }
        const limitsJson = client.accountant.subscription?.plan?.limitsJson;
        const maxPayments = limitsJson?.maxPayments ?? 20;
        if (maxPayments === -1) {
            return {
                allowed: true,
                usage: {
                    current: 0,
                    limit: -1,
                    percentage: 0,
                    isUnlimited: true,
                },
            };
        }
        const currentCount = await this.prisma.payment.count({
            where: {
                clientId,
            },
        });
        const usage = {
            current: currentCount,
            limit: maxPayments,
            percentage: Math.round((currentCount / maxPayments) * 100),
            isUnlimited: false,
        };
        if (currentCount >= maxPayments) {
            return {
                allowed: false,
                usage,
                message: `Você atingiu o limite de ${maxPayments} ${maxPayments === 1 ? 'pagamento' : 'pagamentos'} do seu plano.`,
                upgradeMessage: `Entre em contato com seu contador para solicitar um plano com mais capacidade.`,
            };
        }
        return {
            allowed: true,
            usage,
        };
    }
    async checkExpenseLimit(clientId) {
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
            throw new common_1.ForbiddenException('Cliente não encontrado');
        }
        const limitsJson = client.accountant.subscription?.plan?.limitsJson;
        const maxExpenses = limitsJson?.maxExpenses ?? 20;
        if (maxExpenses === -1) {
            return {
                allowed: true,
                usage: {
                    current: 0,
                    limit: -1,
                    percentage: 0,
                    isUnlimited: true,
                },
            };
        }
        const currentCount = await this.prisma.expense.count({
            where: {
                clientId,
            },
        });
        const usage = {
            current: currentCount,
            limit: maxExpenses,
            percentage: Math.round((currentCount / maxExpenses) * 100),
            isUnlimited: false,
        };
        if (currentCount >= maxExpenses) {
            return {
                allowed: false,
                usage,
                message: `Você atingiu o limite de ${maxExpenses} ${maxExpenses === 1 ? 'despesa' : 'despesas'} do seu plano.`,
                upgradeMessage: `Entre em contato com seu contador para solicitar um plano com mais capacidade.`,
            };
        }
        return {
            allowed: true,
            usage,
        };
    }
    async getAccountantUsage(accountantId) {
        const limits = await this.getAccountantLimits(accountantId);
        const clientsCount = await this.prisma.client.count({
            where: {
                accountantId,
                deletedAt: null,
            },
        });
        const [documentsCount, paymentsCount, expensesCount, storageData] = await Promise.all([
            this.prisma.document.count({
                where: {
                    client: {
                        accountantId,
                        deletedAt: null,
                    },
                    deletedAt: null,
                },
            }),
            this.prisma.payment.count({
                where: {
                    client: {
                        accountantId,
                        deletedAt: null,
                    },
                },
            }),
            this.prisma.expense.count({
                where: {
                    client: {
                        accountantId,
                        deletedAt: null,
                    },
                },
            }),
            this.prisma.document.aggregate({
                where: {
                    client: {
                        accountantId,
                        deletedAt: null,
                    },
                    deletedAt: null,
                },
                _sum: {
                    fileSize: true,
                },
            }),
        ]);
        const storageUsedBytes = storageData._sum.fileSize || 0;
        const storageUsedGB = Number((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2));
        return {
            limits,
            usage: {
                clients: {
                    current: clientsCount,
                    limit: limits.maxClients ?? 0,
                    percentage: limits.maxClients === -1 ? 0 : Math.round((clientsCount / (limits.maxClients ?? 1)) * 100),
                    isUnlimited: limits.maxClients === -1,
                },
                documents: {
                    current: documentsCount,
                    limit: limits.maxDocuments ?? 0,
                    percentage: limits.maxDocuments === -1 ? 0 : Math.round((documentsCount / (limits.maxDocuments ?? 1)) * 100),
                    isUnlimited: limits.maxDocuments === -1,
                },
                payments: {
                    current: paymentsCount,
                    limit: limits.maxPayments ?? 0,
                    percentage: limits.maxPayments === -1 ? 0 : Math.round((paymentsCount / (limits.maxPayments ?? 1)) * 100),
                    isUnlimited: limits.maxPayments === -1,
                },
                expenses: {
                    current: expensesCount,
                    limit: limits.maxExpenses ?? 0,
                    percentage: limits.maxExpenses === -1 ? 0 : Math.round((expensesCount / (limits.maxExpenses ?? 1)) * 100),
                    isUnlimited: limits.maxExpenses === -1,
                },
                storage: {
                    current: storageUsedGB,
                    limit: limits.storageGB ?? 0,
                    percentage: limits.storageGB === -1 ? 0 : Math.round((storageUsedGB / (limits.storageGB ?? 1)) * 100),
                    isUnlimited: limits.storageGB === -1,
                },
            },
        };
    }
    async getSuggestedPlans(accountantId, limitType) {
        const accountant = await this.prisma.accountant.findUnique({
            where: { id: accountantId },
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
            },
        });
        if (!accountant?.subscription?.plan) {
            return [];
        }
        const currentPlan = accountant.subscription.plan;
        const tenantType = currentPlan.tenantType;
        const allPlans = await this.prisma.plan.findMany({
            where: {
                tenantType,
                isActive: true,
                slug: {
                    not: {
                        contains: 'trial',
                    },
                },
                priceMonthly: {
                    gt: currentPlan.priceMonthly,
                },
            },
            orderBy: {
                priceMonthly: 'asc',
            },
            take: 2,
        });
        return allPlans.map(p => p.name);
    }
};
exports.LimitsService = LimitsService;
exports.LimitsService = LimitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LimitsService);
//# sourceMappingURL=limits.service.js.map