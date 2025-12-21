import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadResponseDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
