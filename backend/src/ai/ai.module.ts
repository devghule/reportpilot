import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CommonModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
