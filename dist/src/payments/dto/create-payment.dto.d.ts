import { PaymentMethod } from '@prisma/client';
import { PaymentType } from '../enums/payment-type.enum';
import { RecurringFrequency } from '../enums/recurring-frequency.enum';
export declare class CreatePaymentDto {
    clientId?: string;
    paymentType?: PaymentType;
    title: string;
    amount: number;
    paymentDate?: string;
    dueDate: string;
    paymentMethod?: PaymentMethod;
    reference?: string;
    notes?: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    recurringDayOfMonth?: number;
    recurringEndDate?: string;
}
