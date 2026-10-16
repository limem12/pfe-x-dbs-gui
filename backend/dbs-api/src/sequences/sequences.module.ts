import { Module } from '@nestjs/common';
import { SequencesController } from './sequences.controller';
import { SequencesService } from './sequences.service';
import { DatabaseModule } from '../database/database.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [DatabaseModule, HistoryModule],
  controllers: [SequencesController],
  providers: [SequencesService],
  exports: [SequencesService],
})
export class SequencesModule {}
