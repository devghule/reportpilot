import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MetaModule } from '../meta/meta.module';
import { SheetsModule } from '../sheets/sheets.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [CommonModule, MetaModule, SheetsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
