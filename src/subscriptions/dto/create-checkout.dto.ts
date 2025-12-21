import { IsString, IsEnum, IsOptional } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreateCheckoutDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
