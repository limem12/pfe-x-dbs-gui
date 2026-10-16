import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StepController } from './step.controller';
import { StepService } from './step.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StepController],
  providers: [StepService],
  exports: [StepService],
})
export class StepModule {}
