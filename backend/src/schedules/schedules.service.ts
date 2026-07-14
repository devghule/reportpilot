import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  addDays,
  addMonths,
  format,
  isBefore,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  subDays,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { MetaService } from '../meta/meta.service';
import { SheetsService } from '../sheets/sheets.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import type { Schedule } from '@prisma/client';

const RETRY_DELAYS_MINUTES = [15, 30];
const FREQUENCY_TO_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaService: MetaService,
    private readonly sheetsService: SheetsService,
  ) {}

  // ---------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------

  // Selecting instead of including the full related rows — `account`
  // otherwise carries the encrypted Meta accessToken and Google refresh
  // token straight to the client. The frontend only ever reads account
  // name/currency and template name, so there's no reason those ciphertext
  // blobs should leave the server at all.
  private readonly scheduleListArgs = {
    include: {
      template: { select: { id: true, name: true, reportLevel: true } },
      account: { select: { id: true, metaAccountName: true, currency: true } },
    },
  } as const;

  async findAll(userId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: { userId },
      ...this.scheduleListArgs,
    });
    return schedules.map((schedule) => ({
      ...schedule,
      lastRunDisplay: this.formatRunDisplay(schedule.lastRunAt, schedule.lastRunStatus),
      nextRunDisplay: schedule.nextRunAt ? format(schedule.nextRunAt, 'PPpp') : null,
    }));
  }

  // Verifies templateId/accountId in a schedule DTO actually belong to this
  // user before touching the DB. Without this, create() would happily
  // reference another user's template/account (Prisma's FK constraint only
  // checks the row exists, not who owns it) — the schedule would then just
  // fail silently at execution time instead of erroring clearly right away.
  private async assertOwnsScheduleInputs(
    userId: string,
    templateId?: string,
    accountId?: string,
  ): Promise<void> {
    if (templateId) {
      const template = await this.prisma.template.findFirst({
        where: { id: templateId, userId },
        select: { id: true },
      });
      if (!template) {
        throw new NotFoundException('Template not found.');
      }
    }
    if (accountId) {
      const account = await this.prisma.connectedAccount.findFirst({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!account) {
        throw new NotFoundException('Connected account not found.');
      }
    }
  }

  async create(userId: string, dto: CreateScheduleDto) {
    await this.assertOwnsScheduleInputs(userId, dto.templateId, dto.accountId);

    const nextRunAt = this.calculateNextRun({
      frequency: dto.frequency,
      refreshTime: dto.refreshTime,
      timezone: dto.timezone,
    });

    const schedule = await this.prisma.schedule.create({
      data: { ...dto, userId, nextRunAt },
    });
    this.logger.log(`Schedule ${schedule.id} created for user ${userId} (${dto.frequency} at ${dto.refreshTime})`);
    return schedule;
  }

  async update(userId: string, id: string, dto: UpdateScheduleDto) {
    const schedule = await this.findOwned(userId, id);
    await this.assertOwnsScheduleInputs(userId, dto.templateId, dto.accountId);

    // nextRunAt was never recalculated here — editing an active schedule's
    // time/frequency/timezone silently kept firing at the OLD time until it
    // happened to pass once and get recomputed naturally. Recompute whenever
    // any of the three inputs to calculateNextRun changed.
    const scheduleAffectingFieldsChanged =
      (dto.frequency !== undefined && dto.frequency !== schedule.frequency) ||
      (dto.refreshTime !== undefined && dto.refreshTime !== schedule.refreshTime) ||
      (dto.timezone !== undefined && dto.timezone !== schedule.timezone);

    const nextRunAt = scheduleAffectingFieldsChanged
      ? this.calculateNextRun({
          frequency: dto.frequency ?? schedule.frequency,
          refreshTime: dto.refreshTime ?? schedule.refreshTime,
          timezone: dto.timezone ?? schedule.timezone,
        })
      : undefined;

    return this.prisma.schedule.update({
      where: { id: schedule.id },
      data: { ...dto, ...(nextRunAt ? { nextRunAt } : {}) },
    });
  }

  async remove(userId: string, id: string) {
    const schedule = await this.findOwned(userId, id);
    await this.prisma.schedule.delete({ where: { id: schedule.id } });
    return { success: true };
  }

  async pause(userId: string, id: string) {
    const schedule = await this.findOwned(userId, id);
    return this.prisma.schedule.update({
      where: { id: schedule.id },
      data: { status: 'paused' },
    });
  }

  async resume(userId: string, id: string) {
    const schedule = await this.findOwned(userId, id);
    const nextRunAt = this.calculateNextRun(schedule);
    return this.prisma.schedule.update({
      where: { id: schedule.id },
      data: { status: 'active', nextRunAt },
    });
  }

  async runNow(userId: string, id: string) {
    const schedule = await this.findOwned(userId, id);
    await this.executeSchedule(schedule);
    return { success: true, ranAt: new Date().toISOString() };
  }

  private async findOwned(userId: string, id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) {
      throw new NotFoundException('Schedule not found.');
    }
    return schedule;
  }

  private formatRunDisplay(lastRunAt: Date | null, lastRunStatus: string | null) {
    if (!lastRunAt) return null;
    const statusLabel = lastRunStatus === 'success' ? 'Success' : 'Failed';
    return `${format(lastRunAt, 'PPpp')} — ${statusLabel}`;
  }

  // ---------------------------------------------------------------------
  // 9.2 Cron job — runs every minute, executes due schedules
  // ---------------------------------------------------------------------

  @Cron('* * * * *')
  async runDueSchedules() {
    const now = new Date();
    const due = await this.prisma.schedule.findMany({
      where: { status: 'active', nextRunAt: { lte: now } },
    });
    await Promise.allSettled(due.map((schedule) => this.executeSchedule(schedule)));
  }

  // ---------------------------------------------------------------------
  // 9.3 Execute schedule
  // ---------------------------------------------------------------------

  async executeSchedule(schedule: Schedule) {
    try {
      const account = await this.prisma.connectedAccount.findUnique({
        where: { id: schedule.accountId },
      });
      if (!account) {
        throw new Error('Connected account no longer exists.');
      }

      const { dateRange, prevDateRange } = this.buildDateRanges(schedule.frequency);
      const data = await this.metaService.import(schedule.userId, {
        templateId: schedule.templateId,
        accountId: schedule.accountId,
        dateRange,
        prevDateRange,
      });

      await this.sheetsService.writeReport(
        account.googleRefToken ?? '',
        schedule.sheetId,
        schedule.sheetTabName,
        data,
      );

      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'success',
          lastError: null,
          retryCount: 0,
          nextRunAt: this.calculateNextRun(schedule),
        },
      });
      this.logger.log(
        `Schedule ${schedule.id} executed successfully (${data.rows.length} rows written to "${schedule.sheetTabName}")`,
      );
    } catch (error) {
      await this.handleFailure(schedule, error);
    }
  }

  // ---------------------------------------------------------------------
  // 9.4 Failure and retry
  // ---------------------------------------------------------------------

  private async handleFailure(schedule: Schedule, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const attempt = schedule.retryCount + 1;

    this.logger.warn(`Schedule ${schedule.id} failed (attempt ${attempt}): ${message}`);

    if (attempt <= RETRY_DELAYS_MINUTES.length) {
      const delayMinutes = RETRY_DELAYS_MINUTES[attempt - 1];
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          retryCount: attempt,
          lastRunAt: new Date(),
          nextRunAt: new Date(Date.now() + delayMinutes * 60 * 1000),
        },
      });
      return;
    }

    await this.prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'failed',
        lastError: message,
        retryCount: 0,
        nextRunAt: this.calculateNextRun(schedule),
      },
    });
  }

  // ---------------------------------------------------------------------
  // 9.5 Next run calculation — timezone-aware
  // ---------------------------------------------------------------------

  calculateNextRun(schedule: {
    frequency: string;
    refreshTime: string;
    timezone: string;
  }): Date {
    const [hour, minute] = schedule.refreshTime.split(':').map(Number);
    const zonedNow = toZonedTime(new Date(), schedule.timezone);

    let target = setMilliseconds(
      setSeconds(setMinutes(setHours(zonedNow, hour), minute), 0),
      0,
    );

    if (!isBefore(zonedNow, target)) {
      // The scheduled time has already passed for this cycle — advance it.
      if (schedule.frequency === 'daily') target = addDays(target, 1);
      else if (schedule.frequency === 'weekly') target = addDays(target, 7);
      else if (schedule.frequency === 'monthly') target = addMonths(target, 1);
    }

    return fromZonedTime(target, schedule.timezone);
  }

  private buildDateRanges(frequency: string) {
    const days = FREQUENCY_TO_DAYS[frequency] ?? 1;
    const today = new Date();
    const current = {
      since: format(subDays(today, days), 'yyyy-MM-dd'),
      until: format(today, 'yyyy-MM-dd'),
    };
    const previous = {
      since: format(subDays(today, days * 2), 'yyyy-MM-dd'),
      until: format(subDays(today, days), 'yyyy-MM-dd'),
    };
    return { dateRange: current, prevDateRange: previous };
  }
}
