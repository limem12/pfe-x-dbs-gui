import { Module } from '@nestjs/common';
import { ProductStepLimitController } from './product-step-limit.controller';
import { ProductStepLimitService } from './product-step-limit.service';

@Module({
  controllers: [ProductStepLimitController],
  providers: [ProductStepLimitService],
  exports: [ProductStepLimitService],
})
export class ProductStepLimitModule {}
