import { PaymentStatus } from '@prisma/client';
import { PaymentType } from '../enums/payment-type.enum';
export declare class QueryPaymentsDto {
    search?: string;
    status?: PaymentStatus;
    type?: PaymentType;
    clientId?: string;
    period?: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL';
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
