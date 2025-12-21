import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getMySubscription(req: any): Promise<{
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
    getMyUsage(req: any): Promise<{
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
    createCheckout(req: any, createCheckoutDto: CreateCheckoutDto): Promise<{
        url: string;
    }>;
    upgradePlan(req: any, upgradePlanDto: UpgradePlanDto): Promise<{
        message: string;
        subscription: any;
    }>;
    downgradePlan(req: any, downgradePlanDto: UpgradePlanDto): Promise<{
        message: string;
        effectiveDate: Date;
    }>;
    cancelSubscription(req: any, cancelDto: CancelSubscriptionDto): Promise<{
        message: string;
        effectiveDate?: Date;
    }>;
    createPortal(req: any, returnUrl?: string): Promise<{
        url: string;
    }>;
}
