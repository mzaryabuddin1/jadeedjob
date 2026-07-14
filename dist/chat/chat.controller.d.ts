import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMessages(id: number, page: number, limit: number, req: any): Promise<{
        data: {
            id: number;
            chatId: number;
            jobApplicationId: number;
            senderId: number;
            senderName: string;
            senderAvatar: string;
            text: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
            }[];
            messageType: string;
            createdAt: Date;
            readAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
