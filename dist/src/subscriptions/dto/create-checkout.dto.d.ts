import { BillingInterval } from '@prisma/client';
export declare class CreateCheckoutDto {
    planId: string;
    interval?: BillingInterval;
    successUrl?: string;
    cancelUrl?: string;
}
