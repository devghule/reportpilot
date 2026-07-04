import { Module } from '@nestjs/common';
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

@Module({
  imports: [AuthModule, UsersModule, MetaModule, TemplatesModule, SchedulesModule, SheetsModule, AiModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
