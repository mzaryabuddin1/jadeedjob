import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from 'src/users/entities/user.entity';
type CreateNotificationInput = {
    userId: number;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
};
export declare class NotificationsService {
    private readonly notificationRepo;
    private readonly userRepo;
    constructor(notificationRepo: Repository<Notification>, userRepo: Repository<User>);
    private format;
    create(input: CreateNotificationInput): Promise<{
        id: number;
        type: string;
        title: string;
        message: string;
        receivedAt: Date;
        unread: boolean;
        data: Record<string, any>;
    }>;
    createMany(inputs: CreateNotificationInput[]): Promise<{
        id: number;
        type: string;
        title: string;
        message: string;
        receivedAt: Date;
        unread: boolean;
        data: Record<string, any>;
    }[]>;
    createForFilterSubscribers(filterId: number, title: string, message: string, data: Record<string, any>, excludeUserId?: number): Promise<{
        id: number;
        type: string;
        title: string;
        message: string;
        receivedAt: Date;
        unread: boolean;
        data: Record<string, any>;
    }[]>;
    list(userId: number, page?: number, limit?: number): Promise<{
        data: {
            id: number;
            type: string;
            title: string;
            message: string;
            receivedAt: Date;
            unread: boolean;
            data: Record<string, any>;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    unreadCount(userId: number): Promise<{
        count: number;
    }>;
    markRead(userId: number, id: number): Promise<{
        id: number;
        type: string;
        title: string;
        message: string;
        receivedAt: Date;
        unread: boolean;
        data: Record<string, any>;
    }>;
    markAllRead(userId: number): Promise<{
        message: string;
    }>;
}
export {};
