import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequenceController } from './sequence.controller';
import { SequenceService } from './sequence.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SequenceController],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}
