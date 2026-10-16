import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RightsController } from './rights.controller';
import { RightsService } from './rights.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RightsController],
  providers: [RightsService],
  exports: [RightsService],
})
export class RightsModule {}
