import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PREBUILT_TEMPLATES } from './prebuilt-templates';

@Injectable()
export class TemplatesService {
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the OAuth 500 is root-caused.
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Seeds the 5 prebuilt templates for a user on first login.
  // Checks for existing templates before inserting — safe to call every login.
  async seedPrebuiltTemplates(userId: string) {
    this.logger.log(`[TRACE] seedPrebuiltTemplates() — before Prisma: template.count() userId=${userId}`);
    const existing = await this.prisma.template.count({ where: { userId } });
    this.logger.log(`[TRACE] seedPrebuiltTemplates() — after Prisma: template.count()=${existing}`);
    if (existing > 0) return;

    this.logger.log('[TRACE] seedPrebuiltTemplates() — before Prisma: template.createMany()');
    await this.prisma.template.createMany({
      data: PREBUILT_TEMPLATES.map((template) => ({ ...template, userId })),
    });
    this.logger.log('[TRACE] seedPrebuiltTemplates() — after Prisma: template.createMany()');
  }

  findAll(userId: string) {
    return this.prisma.template.findMany({ where: { userId } });
  }

  async findOne(userId: string, id: string) {
    const template = await this.prisma.template.findFirst({ where: { id, userId } });
    if (!template) {
      throw new NotFoundException('Template not found.');
    }
    return template;
  }

  create(userId: string, dto: CreateTemplateDto) {
    return this.prisma.template.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(userId, id);
    return this.prisma.template.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const template = await this.findOne(userId, id);

    if (template.isPrebuilt) {
      throw new ForbiddenException('Default templates cannot be deleted.');
    }

    const activeSchedules = await this.prisma.schedule.count({
      where: { templateId: id, status: 'active' },
    });
    if (activeSchedules > 0) {
      throw new ForbiddenException(
        `This template is used by ${activeSchedules} active schedules. Delete the schedules first.`,
      );
    }

    await this.prisma.template.delete({ where: { id } });
    return { success: true };
  }
}
