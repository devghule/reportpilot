import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthResult } from './google.strategy';
import { encrypt } from '../common/crypto.util';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class AuthService {
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the OAuth 500 is root-caused.
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly templatesService: TemplatesService,
  ) {}

  async loginWithGoogle(googleResult: GoogleAuthResult) {
    this.logger.log('[TRACE] loginWithGoogle() — entering service');

    this.logger.log('[TRACE] before Prisma: user.upsert()');
    const user = await this.prisma.user.upsert({
      where: { email: googleResult.email },
      create: {
        email: googleResult.email,
        name: googleResult.name,
        googleId: googleResult.googleId,
        avatarUrl: googleResult.avatarUrl,
      },
      update: {
        name: googleResult.name,
        googleId: googleResult.googleId,
        avatarUrl: googleResult.avatarUrl,
      },
    });
    this.logger.log(`[TRACE] after Prisma: user.upsert() — userId=${user.id}`);

    // prompt=consent forces Google to return a fresh refresh token on every
    // login, so we keep any already-connected Meta accounts' Sheets access
    // current. No-op if the user hasn't connected a Meta account yet — the
    // token gets attached the moment the first ConnectedAccount row is created.
    if (googleResult.refreshToken) {
      this.logger.log('[TRACE] before Prisma: connectedAccount.updateMany()');
      await this.prisma.connectedAccount.updateMany({
        where: { userId: user.id },
        data: { googleRefToken: encrypt(googleResult.refreshToken) },
      });
      this.logger.log('[TRACE] after Prisma: connectedAccount.updateMany()');
    }

    this.logger.log('[TRACE] before templatesService.seedPrebuiltTemplates()');
    await this.templatesService.seedPrebuiltTemplates(user.id);
    this.logger.log('[TRACE] after templatesService.seedPrebuiltTemplates()');

    this.logger.log('[TRACE] before jwtService.sign()');
    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });
    this.logger.log(`[TRACE] after jwtService.sign() — token length=${token.length}`);

    this.logger.log('[TRACE] loginWithGoogle() — before returning response');
    return { token, user };
  }

  async getCurrentUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
