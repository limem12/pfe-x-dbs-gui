import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductStepParamController } from './product-step-param.controller';
import { ProductStepParamService } from './product-step-param.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductStepParamController],
  providers: [ProductStepParamService],
  exports: [ProductStepParamService],
})
export class ProductStepParamModule {}
