import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StepLimitController } from './step-limit.controller';
import { StepLimitService } from './step-limit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StepLimitController],
  providers: [StepLimitService],
  exports: [StepLimitService],
})
export class StepLimitModule {}
