import { Module } from '@nestjs/common';
import { ComponentInstanceController } from './component-instance.controller';
import { ComponentInstanceService } from './component-instance.service';

@Module({
  controllers: [ComponentInstanceController],
  providers: [ComponentInstanceService],
  exports: [ComponentInstanceService],
})
export class ComponentInstanceModule {}
