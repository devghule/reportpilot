import { Controller, Get, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { GoogleAuthResult } from './google.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';
import { oauthBridgePage } from '../common/oauth-bridge.util';

@Controller('auth')
export class AuthController {
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the OAuth 500 is root-caused.
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    this.logger.log('[TRACE] GET /auth/google — entering controller (redirect leg)');
    // Passport redirects to Google's consent screen. Nothing to do here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.log('[TRACE] GET /auth/google/callback — entering controller');
    const googleResult = req.user as GoogleAuthResult;
    this.logger.log(
      `[TRACE] req.user from Passport: email=${googleResult?.email} googleId=${googleResult?.googleId} hasRefreshToken=${Boolean(googleResult?.refreshToken)}`,
    );

    this.logger.log('[TRACE] calling authService.loginWithGoogle()');
    const { token, user } = await this.authService.loginWithGoogle(googleResult);
    this.logger.log(`[TRACE] loginWithGoogle() returned — userId=${user.id}, token length=${token?.length}`);

    this.logger.log('[TRACE] building bridge HTML response and sending to client');
    res.type('html').send(oauthBridgePage('google-auth-success', { token, user }));
    this.logger.log('[TRACE] response sent — /auth/google/callback complete');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: JwtPayload) {
    return this.authService.getCurrentUser(currentUser.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    // JWTs are stateless — nothing to invalidate server-side.
    return { success: true };
  }
}
