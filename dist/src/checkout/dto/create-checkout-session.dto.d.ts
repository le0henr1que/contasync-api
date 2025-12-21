import { BillingInterval } from '@prisma/client';
export declare class CreateCheckoutSessionDto {
    email: string;
    name: string;
    password: string;
    cpfCnpj: string;
    companyName: string;
    crc: string;
    phone?: string;
    planId: string;
    billingInterval: BillingInterval;
}
