import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MetaModule } from './meta/meta.module';
import { TemplatesModule } from './templates/templates.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SheetsModule } from './sheets/sheets.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      // process.cwd()-relative, not __dirname-relative: __dirname points at
      // dist/src at runtime (even under `nest start`), but Nest is always
      // launched from the backend/ directory, and the sidebar's Vite build
      // outputs to backend/public regardless of dev vs prod.
      rootPath: join(process.cwd(), 'public'),
    }),

    CommonModule,
    AuthModule,
    UsersModule,
    MetaModule,
    TemplatesModule,
    SchedulesModule,
    SheetsModule,
    AiModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}