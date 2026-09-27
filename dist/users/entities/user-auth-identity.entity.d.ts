import { User } from './user.entity';
export type AuthProviderType = 'google' | 'facebook';
export declare class UserAuthIdentity {
    id: number;
    userId: number;
    user: User;
    provider: AuthProviderType;
    providerId: string;
    providerEmail: string | null;
    linkedAt: Date;
}
