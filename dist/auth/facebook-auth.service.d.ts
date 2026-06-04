import { ConfigService } from '@nestjs/config';
export interface FacebookProfile {
    providerId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    picture: string | null;
}
export declare class FacebookAuthService {
    private readonly configService;
    constructor(configService: ConfigService);
    private getAppId;
    private getAppSecret;
    private normalizeToken;
    private graphGet;
    private debugToken;
    getProfileFromToken(rawToken: string): Promise<FacebookProfile>;
}
