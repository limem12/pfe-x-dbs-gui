import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequenceStepController } from './sequence-step.controller';
import { SequenceStepService } from './sequence-step.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SequenceStepController],
  providers: [SequenceStepService],
  exports: [SequenceStepService],
})
export class SequenceStepModule {}
