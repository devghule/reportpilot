import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.schedulesService.findAll(currentUser.userId);
  }

  @Post()
  create(@CurrentUser() currentUser: JwtPayload, @Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(currentUser.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(currentUser.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.schedulesService.remove(currentUser.userId, id);
  }

  @Post(':id/run-now')
  runNow(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.schedulesService.runNow(currentUser.userId, id);
  }

  @Patch(':id/pause')
  pause(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.schedulesService.pause(currentUser.userId, id);
  }

  @Patch(':id/resume')
  resume(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.schedulesService.resume(currentUser.userId, id);
  }
}
