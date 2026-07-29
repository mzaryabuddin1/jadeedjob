import { User } from 'src/users/entities/user.entity';
export declare class AuthIdentity {
    id: number;
    userId: number;
    user: User;
    provider: 'google' | 'facebook';
    subject: string;
    providerEmail: string;
    providerMetadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
