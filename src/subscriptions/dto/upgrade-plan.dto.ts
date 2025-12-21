import { IsString, IsEnum, IsOptional } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class UpgradePlanDto {
  @IsString()
  newPlanId: string;

  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval;
}
