import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { ChatEvents } from 'src/chat/chat-events.service';
export type InboxMessage = {
    type?: string;
    title: string;
    body: string;
    data?: Record<string, string | number | boolean | null | undefined>;
};
export declare class NotificationInbox implements OnModuleInit, OnModuleDestroy {
    private readonly repo;
    private readonly events;
    private readonly logger;
    private timer;
    constructor(repo: Repository<Notification>, events: ChatEvents);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private purge;
    add(userId: number, message: InboxMessage): Promise<Notification>;
    addMany(userIds: number[], message: InboxMessage): Promise<void>;
    private values;
    list(userId: number, opts: {
        before?: number;
        limit?: number;
        unreadOnly?: boolean;
        type?: string;
    }): Promise<{
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
    unreadCount(userId: number): Promise<number>;
    markRead(userId: number, id: number): Promise<{
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
    markAllRead(userId: number, type?: string): Promise<{
        updated: number;
        unreadCount: number;
    }>;
    remove(userId: number, id: number): Promise<{
        message: string;
        unreadCount: number;
    }>;
    clear(userId: number, onlyRead: boolean): Promise<{
        deleted: number;
        unreadCount: number;
    }>;
    private own;
    view(n: Notification): {
        id: number;
        type: string;
        title: string;
        body: string;
        path: string;
        data: Record<string, string>;
        read: boolean;
        readAt: Date;
        createdAt: Date;
    };
}
