import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDistributionConfigDto {
  @IsOptional()
  @IsBoolean({ message: 'O cálculo automático deve ser verdadeiro ou falso' })
  isAutoCalculateExpenses?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'O status ativo deve ser verdadeiro ou falso' })
  isActive?: boolean;
}
