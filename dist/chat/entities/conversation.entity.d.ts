export type ConversationType = 'direct' | 'job';
export declare class Conversation {
    id: number;
    type: ConversationType;
    key: string;
    jobId: number | null;
    createdBy: number;
    lastMessageId: number | null;
    lastMessageAt: Date | null;
    createdAt: Date;
}
