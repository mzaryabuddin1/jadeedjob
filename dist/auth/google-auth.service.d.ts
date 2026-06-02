import { ConfigService } from '@nestjs/config';
export interface GoogleProfile {
    providerId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    picture: string | null;
}
export declare class GoogleAuthService {
    private readonly configService;
    private readonly oauthClient;
    constructor(configService: ConfigService);
    private normalizeToken;
    private getClientIds;
    getProfileFromToken(rawToken: string): Promise<GoogleProfile>;
}
