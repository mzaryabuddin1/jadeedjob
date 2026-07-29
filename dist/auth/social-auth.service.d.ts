import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthIdentity } from './entities/auth-identity.entity';
import { AuthService } from './auth.service';
import { AuthSocialChallenge } from './entities/auth-social-challenge.entity';
type ProviderProfile = {
    provider: 'google' | 'facebook';
    subject: string;
    firstName: string;
    lastName: string;
    email?: string;
    picture?: string;
};
export declare class SocialAuthService {
    private readonly identityRepo;
    private readonly challengeRepo;
    private readonly authService;
    private readonly googleClient;
    constructor(identityRepo: Repository<AuthIdentity>, challengeRepo: Repository<AuthSocialChallenge>, authService: AuthService);
    verifyGoogle(idToken: string): Promise<{
        provider: "google";
        subject: string;
        firstName: string;
        lastName: string;
        email: string;
        picture: string;
    }>;
    verifyFacebook(accessToken: string): Promise<{
        provider: "facebook";
        subject: string;
        firstName: any;
        lastName: any;
        email: any;
        picture: any;
    }>;
    findLinkedUser(profile: ProviderProfile): Promise<User>;
    createPhoneChallenge(profile: ProviderProfile): Promise<{
        code: string;
        message: string;
        socialVerificationToken: string;
        expiresIn: number;
        profilePreview: {
            firstName: string;
            lastName: string;
            picture: string;
        };
    }>;
    verifyPhoneChallenge(token: string): Promise<ProviderProfile & {
        jti: string;
    }>;
    consumePhoneChallenge(token: string): Promise<ProviderProfile & {
        jti: string;
    }>;
    linkVerifiedPhone(profile: ProviderProfile, phone: string): Promise<User>;
    private challengeSecret;
    private splitName;
}
export {};
