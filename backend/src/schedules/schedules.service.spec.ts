import { SchedulesService } from './schedules.service';

// calculateNextRun is a pure function of (schedule, current time) — the only
// piece of scheduling logic worth unit-testing without a real DB. Everything
// else in this service is CRUD/orchestration, covered by TEST_CHECKLIST.md
// manual flows instead.
describe('SchedulesService.calculateNextRun', () => {
  let service: SchedulesService;

  beforeEach(() => {
    service = new SchedulesService(
      {} as any, // PrismaService — unused by calculateNextRun
      {} as any, // MetaService
      {} as any, // SheetsService
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules for later today when the refresh time has not passed yet', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T08:00:00.000Z'));

    const nextRun = service.calculateNextRun({
      frequency: 'daily',
      refreshTime: '14:30',
      timezone: 'UTC',
    });

    expect(nextRun.toISOString()).toBe('2026-07-14T14:30:00.000Z');
  });

  it('rolls a daily schedule to tomorrow once the refresh time has passed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T20:00:00.000Z'));

    const nextRun = service.calculateNextRun({
      frequency: 'daily',
      refreshTime: '14:30',
      timezone: 'UTC',
    });

    expect(nextRun.toISOString()).toBe('2026-07-15T14:30:00.000Z');
  });

  it('rolls a weekly schedule forward 7 days once the refresh time has passed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T20:00:00.000Z'));

    const nextRun = service.calculateNextRun({
      frequency: 'weekly',
      refreshTime: '14:30',
      timezone: 'UTC',
    });

    expect(nextRun.toISOString()).toBe('2026-07-21T14:30:00.000Z');
  });

  it('rolls a monthly schedule forward 1 month once the refresh time has passed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T20:00:00.000Z'));

    const nextRun = service.calculateNextRun({
      frequency: 'monthly',
      refreshTime: '14:30',
      timezone: 'UTC',
    });

    expect(nextRun.toISOString()).toBe('2026-08-14T14:30:00.000Z');
  });

  it('is timezone-aware: a refresh time already past in one zone can still be upcoming in UTC', () => {
    // 09:00 in America/New_York (UTC-4 in July) is 13:00 UTC.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T12:00:00.000Z'));

    const nextRun = service.calculateNextRun({
      frequency: 'daily',
      refreshTime: '09:00',
      timezone: 'America/New_York',
    });

    expect(nextRun.toISOString()).toBe('2026-07-14T13:00:00.000Z');
  });
});
