import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { FolderType } from '@prisma/client';

export class CreateFolderDto {
  @ApiProperty({
    description: 'Nome da pasta',
    example: 'Contratos 2024',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tipo da pasta',
    enum: FolderType,
    example: FolderType.CONTRATOS,
  })
  @IsEnum(FolderType)
  type: FolderType;

  @ApiPropertyOptional({
    description: 'Ícone da pasta (emoji)',
    example: '📄',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Cor da pasta em hexadecimal',
    example: '#8b5cf6',
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Descrição da pasta',
    example: 'Contratos firmados durante o ano de 2024',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
