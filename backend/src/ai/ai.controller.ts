import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiGenerateDto } from './dto/ai-generate.dto';
import { AiFeedbackDto } from './dto/ai-feedback.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generate(@CurrentUser() currentUser: JwtPayload, @Body() dto: AiGenerateDto) {
    return this.aiService.generate(currentUser.userId, dto);
  }

  @Post('feedback')
  feedback(@CurrentUser() currentUser: JwtPayload, @Body() dto: AiFeedbackDto) {
    return this.aiService.feedback(currentUser.userId, dto);
  }

  @Get('history')
  history(@CurrentUser() currentUser: JwtPayload) {
    return this.aiService.history(currentUser.userId);
  }
}
