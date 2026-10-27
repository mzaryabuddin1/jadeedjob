import { NotificationInbox } from './notification-inbox.service';
export declare class NotificationsController {
    private readonly inbox;
    constructor(inbox: NotificationInbox);
    list(before: string, limit: string, unreadOnly: string, type: string, req: any): Promise<{
        data: {
            id: number;
            type: string;
            title: string;
            body: string;
            path: string;
            data: Record<string, string>;
            read: boolean;
            readAt: Date;
            createdAt: Date;
        }[];
        nextCursor: number;
        hasMore: boolean;
        unreadCount: number;
    }>;
    unread(req: any): Promise<{
        unreadCount: number;
    }>;
    readAll(type: string, req: any): Promise<{
        updated: number;
        unreadCount: number;
    }>;
    clear(onlyRead: string, req: any): Promise<{
        deleted: number;
        unreadCount: number;
    }>;
    read(id: number, req: any): Promise<{
        unreadCount: number;
        id: number;
        type: string;
        title: string;
        body: string;
        path: string;
        data: Record<string, string>;
        read: boolean;
        readAt: Date;
        createdAt: Date;
    }>;
    remove(id: number, req: any): Promise<{
        message: string;
        unreadCount: number;
    }>;
}
