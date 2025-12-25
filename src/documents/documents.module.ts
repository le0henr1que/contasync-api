import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, LimitsModule, StorageModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
