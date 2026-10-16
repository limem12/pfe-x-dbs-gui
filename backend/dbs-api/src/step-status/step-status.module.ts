import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StepStatusController } from './step-status.controller';
import { StepStatusService } from './step-status.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StepStatusController],
  providers: [StepStatusService],
  exports: [StepStatusService],
})
export class StepStatusModule {}
