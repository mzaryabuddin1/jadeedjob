export type QueueItemStatus = 'pending' | 'claimed' | 'sent' | 'skipped' | 'failed';
export declare class NotificationQueueItem {
    id: number;
    type: string;
    groupKey: string;
    recipientId: number;
    payload: Record<string, any> | null;
    status: QueueItemStatus;
    queuedAt: Date;
    notBefore: Date | null;
    claimToken: string | null;
    claimedAt: Date | null;
    processedAt: Date | null;
    attempts: number;
    lastError: string | null;
}
