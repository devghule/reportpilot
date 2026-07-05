import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleAuthResult {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the OAuth 500 is root-caused.
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') as string;
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') as string;
    const callbackURL = config.get<string>('GOOGLE_REDIRECT_URI') as string;

    // [TRACE] Logged at bootstrap, not per-request — confirms the values
    // Render's runtime actually resolved for these three env vars, since a
    // blank/mismatched value here would make every callback fail before our
    // validate() is ever called (the token exchange happens inside passport,
    // which we can't instrument directly).
    // eslint-disable-next-line no-console
    console.log(
      `[TRACE] GoogleStrategy config — clientID=${clientID ? clientID.slice(0, 8) + '…' : 'MISSING'} ` +
        `clientSecret=${clientSecret ? 'set (' + clientSecret.length + ' chars)' : 'MISSING'} ` +
        `callbackURL=${callbackURL ?? 'MISSING'}`,
    );

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  }

  // Forces Google to always return a refresh token, and allows offline access.
  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    // [TRACE] Reaching this line proves Google's token exchange (the
    // external API call, handled inside passport-oauth2) already succeeded.
    // If this log never appears for a failed login, the failure happened
    // during that exchange, not in our code.
    this.logger.log(
      `[TRACE] GoogleStrategy.validate() reached — token exchange succeeded. profile.id=${profile.id}, emails=${JSON.stringify(profile.emails)}`,
    );

    const result: GoogleAuthResult = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? '',
      accessToken,
      refreshToken,
    };

    this.logger.log(`[TRACE] calling done() with result for email=${result.email}`);
    done(null, result);
  }
}
