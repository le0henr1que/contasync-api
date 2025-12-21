import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsBoolean, IsInt, Max } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { PaymentType } from '../enums/payment-type.enum';
import { RecurringFrequency } from '../enums/recurring-frequency.enum';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(PaymentType, { message: 'Tipo de pagamento inválido' })
  paymentType?: PaymentType;

  @IsNotEmpty({ message: 'Digite o título do pagamento' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Digite o valor do pagamento' })
  @IsNumber({}, { message: 'Valor inválido' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @IsOptional()
  @IsDateString({}, { message: 'Data de pagamento inválida' })
  paymentDate?: string;

  @IsNotEmpty({ message: 'Selecione a data de vencimento' })
  @IsDateString({}, { message: 'Data de vencimento inválida' })
  dueDate: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Forma de pagamento inválida' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Recurring payment fields
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(RecurringFrequency, { message: 'Frequência de recorrência inválida' })
  recurringFrequency?: RecurringFrequency;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Dia do mês deve ser entre 1 e 31' })
  @Max(31, { message: 'Dia do mês deve ser entre 1 e 31' })
  recurringDayOfMonth?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Data de término inválida' })
  recurringEndDate?: string;
}
