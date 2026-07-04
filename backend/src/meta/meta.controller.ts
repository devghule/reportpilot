import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { MetaService } from './meta.service';
import { MetaImportDto } from './dto/meta-import.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';
import { oauthBridgePage } from '../common/oauth-bridge.util';

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@CurrentUser() currentUser: JwtPayload) {
    return this.metaService.getAuthUrl(currentUser.userId);
  }

  // No JwtAuthGuard here — Meta redirects the browser here directly with no
  // Authorization header. The user is identified via `state`, which
  // getAuthUrl() set to the userId when building the OAuth URL.
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.metaService.handleCallback(userId, code);
      res.type('html').send(oauthBridgePage('meta-auth-success', result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Meta connection failed.';
      res.type('html').send(oauthBridgePage('meta-auth-error', { message }));
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  listAccounts(@CurrentUser() currentUser: JwtPayload) {
    return this.metaService.listAccounts(currentUser.userId);
  }

  @Get('ad-accounts')
  @UseGuards(JwtAuthGuard)
  listAdAccounts(
    @CurrentUser() currentUser: JwtPayload,
    @Query('bmId') bmId: string,
  ) {
    return this.metaService.listAdAccounts(currentUser.userId, bmId);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  import(@CurrentUser() currentUser: JwtPayload, @Body() dto: MetaImportDto) {
    return this.metaService.import(currentUser.userId, dto);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  disconnect(
    @CurrentUser() currentUser: JwtPayload,
    @Body('accountId') accountId: string,
  ) {
    return this.metaService.disconnect(currentUser.userId, accountId);
  }
}
