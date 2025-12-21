import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
export declare class SubscriptionsService {
    private readonly stripe;
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    private readonly appUrl;
    constructor(stripe: Stripe, prisma: PrismaService, configService: ConfigService);
    createCheckoutSession(accountantId: string, createCheckoutDto: CreateCheckoutDto): Promise<{
        url: string;
    }>;
    private getOrCreateCustomer;
    upgradePlan(accountantId: string, upgradePlanDto: UpgradePlanDto): Promise<{
        message: string;
        subscription: any;
    }>;
    downgradePlan(accountantId: string, downgradePlanDto: UpgradePlanDto): Promise<{
        message: string;
        effectiveDate: Date;
    }>;
    cancelSubscription(accountantId: string, cancelDto: CancelSubscriptionDto): Promise<{
        message: string;
        effectiveDate?: Date;
    }>;
    createPortalSession(accountantId: string, returnUrl?: string): Promise<{
        url: string;
    }>;
    getSubscription(accountantId: string): Promise<{
        id: string;
        planId: string;
        slug: string;
        name: string;
        price: number | import("@prisma/client-runtime-utils").Decimal;
        interval: import("@prisma/client").$Enums.BillingInterval;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        trialEnd: Date;
        features: string[];
    }>;
    getUsage(accountantId: string): Promise<{
        limits: {
            maxClients: any;
            maxDocuments: any;
            maxPayments: any;
            storageGB: any;
        };
        usage: {
            clientsCount: number;
            documentsCount: number;
            paymentsCount: number;
            storageUsedGB: number;
        };
        percentages: {
            clients: number;
            documents: number;
            payments: number;
            storage: number;
        };
    }>;
    private transformFeaturesToArray;
    private sanitizeCNPJ;
}
