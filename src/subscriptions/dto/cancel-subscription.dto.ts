import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  immediate?: boolean; // If true, cancel immediately. If false, cancel at period end

  @IsOptional()
  @IsString()
  reason?: string; // Optional cancellation reason
}
