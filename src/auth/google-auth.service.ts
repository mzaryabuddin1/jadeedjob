import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** Profile from Google ID token — saved on the users table */
export interface GoogleProfile {
  /** Google account id → users.googleId */
  providerId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  picture: string | null;
}

@Injectable()
export class GoogleAuthService {
  private readonly oauthClient = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  private normalizeToken(raw: string): string {
    let token = (raw || '').trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    return token;
  }

  private getClientIds(): string[] {
    const raw = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  /**
   * Verify Google ID token (from Sign-In SDK) and return user profile.
   * No Firebase — only Google's token endpoint / certs.
   */
  async getProfileFromToken(rawToken: string): Promise<GoogleProfile> {
    const idToken = this.normalizeToken(rawToken);
    if (!idToken) {
      throw new UnauthorizedException('idToken is required');
    }

    const audiences = this.getClientIds();
    if (!audiences.length) {
      throw new ServiceUnavailableException(
        'Set GOOGLE_CLIENT_ID in .env (your OAuth Web/Android client id)',
      );
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return {
        providerId: payload.sub,
        email: payload.email?.toLowerCase() ?? null,
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
        lastName:
          payload.family_name ||
          payload.name?.split(' ').slice(1).join(' ') ||
          '',
        picture: payload.picture ?? null,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }

      const detail =
        err instanceof Error ? err.message : 'token verification failed';
      console.error('[GoogleAuth] verifyIdToken failed:', detail, {
        audiences,
      });

      throw new UnauthorizedException(
        `Invalid or expired Google token (${detail}). Ensure GOOGLE_CLIENT_ID matches the Web client that issued the idToken, then restart the server.`,
      );
    }
  }
}
