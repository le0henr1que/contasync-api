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
export declare class LimitsService {
    private prisma;
    constructor(prisma: PrismaService);
    getAccountantLimits(accountantId: string): Promise<PlanLimits>;
    checkClientLimit(accountantId: string): Promise<LimitCheckResult>;
    checkDocumentLimit(clientId: string): Promise<LimitCheckResult>;
    checkPaymentLimit(clientId: string): Promise<LimitCheckResult>;
    checkExpenseLimit(clientId: string): Promise<LimitCheckResult>;
    getAccountantUsage(accountantId: string): Promise<{
        limits: PlanLimits;
        usage: {
            clients: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            documents: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            payments: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            expenses: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
            storage: {
                current: number;
                limit: number;
                percentage: number;
                isUnlimited: boolean;
            };
        };
    }>;
    private getSuggestedPlans;
}
