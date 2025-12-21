import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { PlanLimitsGuard } from '../common/guards/plan-limits.guard';

@Module({
  imports: [PrismaModule, LimitsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, PlanLimitsGuard],
  exports: [ExpensesService],
})
export class ExpensesModule {}
