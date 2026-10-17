import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationQueueItem } from './notification-queue.entity';
export type QueueHandlerResult = 'sent' | 'skipped';
export type QueueRegistration = {
    delaySeconds: number;
    minGapSeconds: number;
    handler: (items: NotificationQueueItem[]) => Promise<QueueHandlerResult>;
};
export declare class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly repo;
    private readonly logger;
    private readonly registrations;
    private timer;
    private running;
    private lastCleanup;
    constructor(repo: Repository<NotificationQueueItem>);
    register(type: string, registration: QueueRegistration): void;
    enqueue(item: {
        type: string;
        groupKey: string;
        recipientId: number;
        payload?: Record<string, any>;
    }): Promise<void>;
    onModuleInit(): void;
    onModuleDestroy(): void;
    tick(): Promise<void>;
    private processType;
    private withinGap;
    private processGroup;
    private releaseStuckClaims;
    private cleanupOld;
}
