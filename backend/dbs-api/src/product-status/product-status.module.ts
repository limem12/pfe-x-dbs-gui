import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductStatusController } from './product-status.controller';
import { ProductStatusService } from './product-status.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductStatusController],
  providers: [ProductStatusService],
  exports: [ProductStatusService],
})
export class ProductStatusModule {}
