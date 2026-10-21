export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export declare const MESSAGE_TYPES: MessageType[];
export declare class ConversationMessage {
    id: number;
    conversationId: number;
    senderId: number;
    messageType: MessageType;
    content: string | null;
    mediaUrl: string | null;
    clientMsgId: string | null;
    createdAt: Date;
    deletedAt: Date | null;
}
