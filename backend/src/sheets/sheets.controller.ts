import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { SheetsTestDto } from './dto/sheets-test.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';

@Controller('sheets')
@UseGuards(JwtAuthGuard)
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Post('test')
  test(@CurrentUser() currentUser: JwtPayload, @Body() dto: SheetsTestDto) {
    return this.sheetsService.writeTest(currentUser.userId, dto.sheetId, dto.value);
  }
}
