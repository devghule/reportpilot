import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import OAuth2Strategy = require('passport-oauth2');

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
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') as string;
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') as string;
    const callbackURL = config.get<string>('GOOGLE_REDIRECT_URI') as string;

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

    // Wraps the underlying OAuth2 HTTP client's getOAuthAccessToken directly,
    // at the call site (node_modules/oauth/lib/oauth2.js) that produces the
    // raw { statusCode, data } error from Google's token endpoint. This is
    // the only place Google's actual error (redirect_uri_mismatch,
    // invalid_client, invalid_grant, etc.) is available before passport-oauth2
    // wraps it into a generic "Bad Request" — logged here so a real cause
    // shows up in production logs instead of a dead end.
    const originalGetOAuthAccessToken = this._oauth2.getOAuthAccessToken.bind(this._oauth2);
    (this._oauth2.getOAuthAccessToken as any) = (
      code: string,
      params: Record<string, unknown>,
      callback: (...args: unknown[]) => void,
    ) => {
      (originalGetOAuthAccessToken as any)(
        code,
        params,
        (err: unknown, accessToken: string, refreshToken: string, results: unknown) => {
          if (err) {
            this.logger.error(`Google token exchange failed: ${JSON.stringify(err)}`);
          }
          callback(err, accessToken, refreshToken, results);
        },
      );
    };
  }

  // Forces Google to always return a refresh token, and allows offline access.
  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  // passport-oauth2 calls this with the raw response body from Google's
  // token endpoint whenever the exchange fails — logging the parsed error
  // here (error / error_description / error_uri), then delegating to the
  // default RFC 6749 parser so behavior is otherwise unchanged.
  parseErrorResponse(body: string, status: number): Error | null {
    this.logger.error(`Google token endpoint error — HTTP ${status}, raw body: ${body}`);
    try {
      const json = JSON.parse(body);
      this.logger.error(
        `Google token error parsed — error="${json.error}" error_description="${json.error_description}" error_uri="${json.error_uri ?? ''}"`,
      );
    } catch (parseErr) {
      this.logger.error(
        'Google token error body was not valid JSON',
        parseErr instanceof Error ? parseErr.stack : String(parseErr),
      );
    }
    return OAuth2Strategy.prototype.parseErrorResponse.call(this, body, status);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const result: GoogleAuthResult = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? '',
      accessToken,
      refreshToken,
    };
    done(null, result);
  }
}
