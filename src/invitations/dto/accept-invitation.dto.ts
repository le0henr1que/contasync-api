import { IsString, MinLength, IsOptional } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
