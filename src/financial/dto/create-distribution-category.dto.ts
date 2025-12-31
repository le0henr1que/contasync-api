import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDistributionCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da categoria é obrigatório' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNumber({}, { message: 'A porcentagem deve ser um número válido' })
  @IsNotEmpty({ message: 'A porcentagem é obrigatória' })
  @Min(0, { message: 'A porcentagem não pode ser negativa' })
  @Max(100, { message: 'A porcentagem não pode ser maior que 100%' })
  percentage: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'A cor deve ter no máximo 50 caracteres' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'O ícone deve ter no máximo 50 caracteres' })
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'A prioridade deve ser maior que 0' })
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
