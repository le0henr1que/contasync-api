import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { LimitsModule } from '../limits/limits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlanLimitsGuard } from '../common/guards/plan-limits.guard';
import { RecurringPaymentsCron } from './cron/recurring-payments.cron';

@Module({
  imports: [PrismaModule, EmailModule, LimitsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PlanLimitsGuard, RecurringPaymentsCron],
})
export class PaymentsModule {}
