import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
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
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google's consent screen. Nothing to do here.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleResult = req.user as GoogleAuthResult;
    const { token, user } = await this.authService.loginWithGoogle(googleResult);
    res.type('html').send(oauthBridgePage('google-auth-success', { token, user }));
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
