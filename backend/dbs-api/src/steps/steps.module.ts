import { Module } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { DatabaseModule } from '../database/database.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [DatabaseModule, HistoryModule],
  controllers: [StepsController],
  providers: [StepsService],
  exports: [StepsService],
})
export class StepsModule {}
