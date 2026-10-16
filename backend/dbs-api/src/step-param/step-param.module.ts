import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StepParamController } from './step-param.controller';
import { StepParamService } from './step-param.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StepParamController],
  providers: [StepParamService],
  exports: [StepParamService],
})
export class StepParamModule {}
