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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.templatesService.findAll(currentUser.userId);
  }

  @Post()
  create(@CurrentUser() currentUser: JwtPayload, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(currentUser.userId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.templatesService.findOne(currentUser.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(currentUser.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() currentUser: JwtPayload, @Param('id') id: string) {
    return this.templatesService.remove(currentUser.userId, id);
  }
}
