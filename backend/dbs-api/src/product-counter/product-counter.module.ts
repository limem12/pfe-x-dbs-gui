import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductCounterController } from './product-counter.controller';
import { ProductCounterService } from './product-counter.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductCounterController],
  providers: [ProductCounterService],
  exports: [ProductCounterService],
})
export class ProductCounterModule {}
