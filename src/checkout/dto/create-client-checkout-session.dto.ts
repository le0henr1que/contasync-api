import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, Matches } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreateClientCheckoutSessionDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Matches(/^\d{11}$/, { message: 'CPF inválido. Deve conter 11 dígitos' })
  cpf: string;

  @IsString()
  @IsNotEmpty({ message: 'ID do plano é obrigatório' })
  planId: string;

  @IsEnum(BillingInterval, { message: 'Intervalo de cobrança inválido. Use MONTHLY ou YEARLY' })
  @IsNotEmpty({ message: 'Intervalo de cobrança é obrigatório' })
  billingInterval: BillingInterval;
}
