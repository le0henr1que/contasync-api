import { PaymentMethod, PaymentStatus } from '@prisma/client';
export declare class UpdatePaymentDto {
    amount?: number;
    paymentDate?: string;
    dueDate?: string;
    paymentMethod?: PaymentMethod;
    status?: PaymentStatus;
    reference?: string;
    notes?: string;
}
