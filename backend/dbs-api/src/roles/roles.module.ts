import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HistoryModule } from '../history/history.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [DatabaseModule, HistoryModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
