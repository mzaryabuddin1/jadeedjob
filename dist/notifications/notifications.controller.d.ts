import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(req: any, page?: number, limit?: number): Promise<{
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
    unreadCount(req: any): Promise<{
        count: number;
    }>;
    markAllRead(req: any): Promise<{
        message: string;
    }>;
    markRead(req: any, id: number): Promise<{
        id: number;
        type: string;
        title: string;
        message: string;
        receivedAt: Date;
        unread: boolean;
        data: Record<string, any>;
    }>;
}
