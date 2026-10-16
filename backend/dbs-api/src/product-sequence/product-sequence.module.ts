import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductSequenceController } from './product-sequence.controller';
import { ProductSequenceService } from './product-sequence.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductSequenceController],
  providers: [ProductSequenceService],
  exports: [ProductSequenceService],
})
export class ProductSequenceModule {}
