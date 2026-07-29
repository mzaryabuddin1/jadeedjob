import { User } from 'src/users/entities/user.entity';
export declare class PushDevice {
    id: number;
    userId: number;
    user: User;
    installationId: string;
    token: string;
    platform: 'ios' | 'android';
    appVersion: string;
    locale: string;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
