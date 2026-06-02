import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  private getAudiences(): string[] {
    const raw = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const audiences = this.getAudiences();
    if (!audiences.length) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured (set GOOGLE_CLIENT_ID in .env)',
      );
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired Google token');
    }
  }
}
