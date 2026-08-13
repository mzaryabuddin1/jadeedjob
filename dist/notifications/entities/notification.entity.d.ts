import { User } from 'src/users/entities/user.entity';
export declare class Notification {
    id: number;
    userId: number;
    user: User;
    type: string;
    title: string;
    message: string;
    data: Record<string, any>;
    dedupeKey: string | null;
    readAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
