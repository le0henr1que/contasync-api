import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
