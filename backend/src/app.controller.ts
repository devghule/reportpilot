import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  ping() {
    return { status: 'ok' };
  }

  // Uptime monitors (UptimeRobot etc.) and Render health checks hit this.
  // Deliberately checks the DB too — a process that's "up" but can't reach
  // Postgres is not actually healthy, and that's the failure mode most
  // worth being paged for.
  @Get('health')
  async health() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'ok',
        dbLatencyMs: Date.now() - startedAt,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        db: 'unreachable',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
