import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { FeedbackType } from '@prisma/client';

export class CreateFeedbackDto {
  @IsEnum(FeedbackType, { message: 'Tipo de feedback inválido' })
  @IsNotEmpty({ message: 'O tipo é obrigatório' })
  tipo: FeedbackType;

  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @Transform(({ value }) => value?.trim())
  titulo: string;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @Transform(({ value }) => value?.trim())
  descricao: string;

  @IsOptional()
  @IsInt({ message: 'A avaliação deve ser um número inteiro' })
  @Min(1, { message: 'A avaliação deve ser entre 1 e 5' })
  @Max(5, { message: 'A avaliação deve ser entre 1 e 5' })
  avaliacao?: number;
}
