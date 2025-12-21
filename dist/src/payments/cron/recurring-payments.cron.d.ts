import { PrismaService } from '../../prisma/prisma.service';
export declare class RecurringPaymentsCron {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateRecurringPayments(): Promise<void>;
    private calculateNextDueDate;
    manualTrigger(): Promise<void>;
}
