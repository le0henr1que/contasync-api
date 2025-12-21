import { Module } from '@nestjs/common';
import { DocumentFoldersService } from './document-folders.service';
import { DocumentFoldersController } from './document-folders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DocumentFoldersService],
  controllers: [DocumentFoldersController],
  exports: [DocumentFoldersService],
})
export class DocumentFoldersModule {}
