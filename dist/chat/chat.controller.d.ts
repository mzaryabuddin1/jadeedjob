import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMessages(id: number, page: number, limit: number, req: any): Promise<{
        data: import("./entities/chat-message.entity").ChatMessage[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
