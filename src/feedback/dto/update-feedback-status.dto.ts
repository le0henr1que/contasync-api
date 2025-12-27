import { IsEnum, IsNotEmpty } from 'class-validator';
import { FeedbackStatus } from '@prisma/client';

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus, { message: 'Status de feedback inválido' })
  @IsNotEmpty({ message: 'O status é obrigatório' })
  status: FeedbackStatus;
}
