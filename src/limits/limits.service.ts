import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanLimits {
  maxClients?: number;
  maxUsers?: number;
  maxPayments?: number;
  maxExpenses?: number;
  maxDocuments?: number;
  storageGB?: number;
}

export interface UsageInfo {
  current: number;
  limit: number;
  percentage: number;
  isUnlimited: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  usage?: UsageInfo;
  message?: string;
  upgradeMessage?: string;
  suggestedPlans?: string[];
}

@Injectable()
export class LimitsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get plan limits for an accountant
   */
  async getAccountantLimits(accountantId: string): Promise<PlanLimits> {
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
      // Default limits if no subscription
      return {
        maxClients: 5,
        maxUsers: 2,
        maxPayments: 20,
        maxExpenses: 20,
        maxDocuments: 10,
        storageGB: 0.2,
      };
    }

    const limitsJson = accountant.subscription.plan.limitsJson as any;
    return {
      maxClients: limitsJson.maxClients,
      maxUsers: limitsJson.maxUsers,
      maxPayments: limitsJson.maxPayments,
      maxExpenses: limitsJson.maxExpenses,
      maxDocuments: limitsJson.maxDocuments,
      storageGB: limitsJson.storageGB,
    };
  }

  /**
   * Check if accountant can create a new client
   */
  async checkClientLimit(accountantId: string): Promise<LimitCheckResult> {
    const limits = await this.getAccountantLimits(accountantId);
    const maxClients = limits.maxClients ?? 0;

    // -1 means unlimited
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

    // Count current clients
    const currentCount = await this.prisma.client.count({
      where: {
        accountantId,
        deletedAt: null,
      },
    });

    const usage: UsageInfo = {
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

  /**
   * Check if a client can create a new document
   */
  async checkDocumentLimit(clientId: string): Promise<LimitCheckResult> {
    // Get client's accountant to check plan limits
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
      throw new ForbiddenException('Cliente não encontrado');
    }

    const limitsJson = client.accountant.subscription?.plan?.limitsJson as any;
    const maxDocuments = limitsJson?.maxDocuments ?? 10;

    // -1 means unlimited
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

    // Count current documents for this client
    const currentCount = await this.prisma.document.count({
      where: {
        clientId,
        deletedAt: null,
      },
    });

    const usage: UsageInfo = {
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

  /**
   * Check if a client can create a new payment
   */
  async checkPaymentLimit(clientId: string): Promise<LimitCheckResult> {
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
      throw new ForbiddenException('Cliente não encontrado');
    }

    const limitsJson = client.accountant.subscription?.plan?.limitsJson as any;
    const maxPayments = limitsJson?.maxPayments ?? 20;

    // -1 means unlimited
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

    // Count current payments for this client
    const currentCount = await this.prisma.payment.count({
      where: {
        clientId,
      },
    });

    const usage: UsageInfo = {
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

  /**
   * Check if a client can create a new expense
   */
  async checkExpenseLimit(clientId: string): Promise<LimitCheckResult> {
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
      throw new ForbiddenException('Cliente não encontrado');
    }

    const limitsJson = client.accountant.subscription?.plan?.limitsJson as any;
    const maxExpenses = limitsJson?.maxExpenses ?? 20;

    // -1 means unlimited
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

    // Count current expenses for this client
    const currentCount = await this.prisma.expense.count({
      where: {
        clientId,
      },
    });

    const usage: UsageInfo = {
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

  /**
   * Get usage statistics for an accountant (for all their clients)
   */
  async getAccountantUsage(accountantId: string) {
    const limits = await this.getAccountantLimits(accountantId);

    // Count clients
    const clientsCount = await this.prisma.client.count({
      where: {
        accountantId,
        deletedAt: null,
      },
    });

    // Count all documents, payments, expenses across all clients
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

  /**
   * Get suggested plans for upgrade
   */
  private async getSuggestedPlans(accountantId: string, limitType: string): Promise<string[]> {
    // Get current plan
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

    // Get all active plans of the same tenant type with higher limits
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
      take: 2, // Suggest top 2 upgrades
    });

    return allPlans.map(p => p.name);
  }
}
