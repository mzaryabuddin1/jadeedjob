export declare class ConversationMember {
    id: number;
    conversationId: number;
    userId: number;
    lastReadMessageId: number;
    mutedUntil: Date | null;
    createdAt: Date;
}
