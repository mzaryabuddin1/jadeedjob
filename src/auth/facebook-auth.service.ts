import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FacebookProfile {
  providerId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  picture: string | null;
}

@Injectable()
export class FacebookAuthService {
  constructor(private readonly configService: ConfigService) {}

  private getAppId(): string {
    return (this.configService.get<string>('FACEBOOK_APP_ID') || '').trim();
  }

  private getAppSecret(): string {
    return (this.configService.get<string>('FACEBOOK_APP_SECRET') || '').trim();
  }

  private normalizeToken(raw: string): string {
    let token = (raw || '').trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    return token;
  }

  private async graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`https://graph.facebook.com/v21.0${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
      const msg =
        (data as { error?: { message?: string } })?.error?.message ||
        'Facebook API error';
      throw new UnauthorizedException(msg);
    }

    return data as T;
  }

  /** Confirm token is valid and issued for this app */
  private async debugToken(accessToken: string): Promise<{ user_id: string }> {
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    if (!appId || !appSecret) {
      throw new ServiceUnavailableException(
        'Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env',
      );
    }

    const appAccessToken = `${appId}|${appSecret}`;

    const data = await this.graphGet<{
      data?: { is_valid?: boolean; user_id?: string; app_id?: string };
    }>('/debug_token', {
      input_token: accessToken,
      access_token: appAccessToken,
    });

    if (!data.data?.is_valid || !data.data.user_id) {
      throw new UnauthorizedException('Invalid Facebook access token');
    }

    if (data.data.app_id && data.data.app_id !== appId) {
      throw new UnauthorizedException('Token was not issued for this app');
    }

    return { user_id: data.data.user_id };
  }

  /**
   * Verify Facebook access token (from Login SDK) and load profile.
   * Client sends accessToken — not Firebase.
   */
  async getProfileFromToken(rawToken: string): Promise<FacebookProfile> {
    const accessToken = this.normalizeToken(rawToken);
    if (!accessToken) {
      throw new UnauthorizedException('accessToken is required');
    }

    try {
      await this.debugToken(accessToken);

      const me = await this.graphGet<{
        id: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        picture?: { data?: { url?: string } };
      }>('/me', {
        access_token: accessToken,
        fields: 'id,email,first_name,last_name,name,picture.type(large)',
      });

      const nameParts = (me.name || 'User').trim().split(/\s+/);

      return {
        providerId: me.id,
        email: me.email?.toLowerCase() ?? null,
        firstName: me.first_name || nameParts[0] || 'User',
        lastName: me.last_name || nameParts.slice(1).join(' ') || '',
        picture: me.picture?.data?.url ?? null,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      throw new UnauthorizedException(
        'Invalid or expired Facebook token. Use the access token from Facebook Login.',
      );
    }
  }
}
