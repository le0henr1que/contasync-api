import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RecurringPaymentsCronService } from './cron/recurring-payments.cron';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialController],
  providers: [FinancialService, RecurringPaymentsCronService],
  exports: [FinancialService]
})
export class FinancialModule {}
