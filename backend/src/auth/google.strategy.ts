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

    // [TRACE] Belt-and-suspenders interception: wrap the underlying OAuth2
    // HTTP client's getOAuthAccessToken directly, at the exact call site
    // (node_modules/oauth/lib/oauth2.js) that produces the raw
    // { statusCode, data } error from Google's token endpoint. This fires
    // unconditionally on every non-2xx response, independent of whether
    // passport-oauth2's own _createOAuthError/parseErrorResponse dispatch
    // ever runs — so if parseErrorResponse's logging isn't showing up, this
    // still will.
    const originalGetOAuthAccessToken =
      this._oauth2.getOAuthAccessToken.bind(this._oauth2);
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
            // eslint-disable-next-line no-console
            console.error(
              `[TRACE] RAW getOAuthAccessToken error (bypassing passport-oauth2 entirely): ${JSON.stringify(err)}`,
            );
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

  // [TRACE] passport-oauth2 calls this with the RAW response body from
  // Google's token endpoint whenever the exchange fails (non-2xx), before
  // wrapping it into the generic `TokenError: Bad Request`. This is the only
  // place the actual Google error (redirect_uri_mismatch, invalid_client,
  // invalid_grant, etc.) is available — logging it here, then delegating to
  // the default RFC 6749 parser so behavior is otherwise unchanged.
  parseErrorResponse(body: string, status: number): Error | null {
    this.logger.error(
      `[TRACE] Google token endpoint error — HTTP ${status}, raw body: ${body}`,
    );
    try {
      const json = JSON.parse(body);
      this.logger.error(
        `[TRACE] Google token error parsed — error="${json.error}" error_description="${json.error_description}" error_uri="${json.error_uri ?? ''}"`,
      );
    } catch (parseErr) {
      this.logger.error(
        '[TRACE] Google token error body was not valid JSON',
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
