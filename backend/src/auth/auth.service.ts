import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthResult } from './google.strategy';
import { encrypt } from '../common/crypto.util';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly templatesService: TemplatesService,
  ) {}

  async loginWithGoogle(googleResult: GoogleAuthResult) {
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

    // prompt=consent forces Google to return a fresh refresh token on every
    // login, so we keep any already-connected Meta accounts' Sheets access
    // current. No-op if the user hasn't connected a Meta account yet — the
    // token gets attached the moment the first ConnectedAccount row is created.
    if (googleResult.refreshToken) {
      await this.prisma.connectedAccount.updateMany({
        where: { userId: user.id },
        data: { googleRefToken: encrypt(googleResult.refreshToken) },
      });
    }

    await this.templatesService.seedPrebuiltTemplates(user.id);

    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    return { token, user };
  }

  async getCurrentUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
