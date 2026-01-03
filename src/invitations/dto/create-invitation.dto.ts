import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  cpfCnpj?: string;
}
