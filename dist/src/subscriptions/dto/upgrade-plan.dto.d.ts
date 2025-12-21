import { BillingInterval } from '@prisma/client';
export declare class UpgradePlanDto {
    newPlanId: string;
    interval?: BillingInterval;
}
