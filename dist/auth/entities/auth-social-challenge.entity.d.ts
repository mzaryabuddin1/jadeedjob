export declare class AuthSocialChallenge {
    id: string;
    provider: 'google' | 'facebook';
    subject: string;
    expiresAt: Date;
    usedAt: Date;
    createdAt: Date;
}
