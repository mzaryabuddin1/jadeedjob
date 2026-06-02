import { ConfigService } from '@nestjs/config';
import { TokenPayload } from 'google-auth-library';
export declare class GoogleAuthService {
    private readonly configService;
    private readonly client;
    constructor(configService: ConfigService);
    private getAudiences;
    verifyIdToken(idToken: string): Promise<TokenPayload>;
}
