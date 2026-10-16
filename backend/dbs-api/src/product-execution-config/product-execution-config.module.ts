import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductExecutionConfigController } from './product-execution-config.controller';
import { ProductExecutionConfigService } from './product-execution-config.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductExecutionConfigController],
  providers: [ProductExecutionConfigService],
  exports: [ProductExecutionConfigService],
})
export class ProductExecutionConfigModule {}
