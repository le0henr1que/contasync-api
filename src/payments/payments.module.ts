import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { LimitsModule } from '../limits/limits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { PlanLimitsGuard } from '../common/guards/plan-limits.guard';

@Module({
  imports: [PrismaModule, EmailModule, LimitsModule, NotificationsModule, StorageModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PlanLimitsGuard],
})
export class PaymentsModule {}
