import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TenantType {
  INDIVIDUAL = 'INDIVIDUAL',
  ACCOUNTANT_FIRM = 'ACCOUNTANT_FIRM',
}

export class SignupDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo do usuário' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@example.com', description: 'E-mail do usuário' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'INDIVIDUAL',
    enum: TenantType,
    description: 'Tipo de conta (INDIVIDUAL ou ACCOUNTANT_FIRM)'
  })
  @IsEnum(TenantType)
  type: TenantType;

  @ApiProperty({ example: '12345678901', description: 'CPF/CNPJ', required: false })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiProperty({ example: 'Minha Empresa', description: 'Nome da empresa', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 'plan_abc123', description: 'ID do plano selecionado', required: false })
  @IsOptional()
  @IsString()
  planId?: string;
}
