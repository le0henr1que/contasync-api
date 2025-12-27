import { IsOptional, IsEnum } from 'class-validator';
import { FeedbackType, FeedbackStatus } from '@prisma/client';

export class QueryFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackType)
  tipo?: FeedbackType;

  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;
}
