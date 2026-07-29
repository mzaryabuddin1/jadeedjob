import { User } from 'src/users/entities/user.entity';
export declare class NotificationPreference {
    id: number;
    userId: number;
    user: User;
    enabled: boolean;
    jobs: boolean;
    applications: boolean;
    messages: boolean;
    community: boolean;
    videos: boolean;
    company: boolean;
    support: boolean;
    updatedAt: Date;
}
