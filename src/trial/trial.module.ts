import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrialService } from './trial.service';
import { TrialController } from './trial.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ScheduleModule.forRoot(), EmailModule],
  controllers: [TrialController],
  providers: [TrialService],
  exports: [TrialService],
})
export class TrialModule {}
