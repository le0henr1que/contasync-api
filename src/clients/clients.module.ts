import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LimitsModule } from '../limits/limits.module';
import { DocumentFoldersModule } from '../document-folders/document-folders.module';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    EmailModule,
    NotificationsModule,
    LimitsModule,
    DocumentFoldersModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
