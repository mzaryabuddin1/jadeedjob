import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMessages(id: number, page: number, limit: number, req: any): Promise<{
        data: {
            id: number;
            chatId: string;
            conversationId: string;
            jobApplicationId: number;
            clientMessageId: string;
            senderId: number;
            senderName: string;
            senderAvatar: string;
            text: string;
            attachments: {
                assetId?: string;
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                sizeBytes?: number;
            }[];
            messageType: string;
            createdAt: Date;
            readAt: Date;
        }[];
        nextBefore: string;
        total: number;
        totalPages: number;
        currentPage: number;
        readOnly: boolean;
        readOnlyReason: string;
    }>;
}
