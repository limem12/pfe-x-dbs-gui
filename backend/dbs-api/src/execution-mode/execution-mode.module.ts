import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExecutionModeController } from './execution-mode.controller';
import { ExecutionModeService } from './execution-mode.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExecutionModeController],
  providers: [ExecutionModeService],
  exports: [ExecutionModeService],
})
export class ExecutionModeModule {}
