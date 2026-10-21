import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMessages(id: number, page: number, limit: number, req: any): Promise<{
        data: {
            id: number;
            jobApplicationId: number;
            senderId: number;
            content: string;
            mediaUrl: string;
            messageType: import("./entities/conversation-message.entity").MessageType;
            createdAt: Date;
            sender: {
                id: number;
                firstName: string;
                lastName: string;
                username: string;
                profile_photo: string;
            };
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
