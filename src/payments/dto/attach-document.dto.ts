import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachDocumentDto {
  @ApiProperty({
    description: 'ID of the document to attach to the payment',
    example: 'cm123abc456def',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;
}
