import { ChatService } from './chat.service';
export declare class JobInvitationController {
    private readonly chatService;
    constructor(chatService: ChatService);
    updateInvitation(id: string, body: {
        action: 'accept' | 'decline' | 'cancel';
    }, req: any): Promise<{
        invitation: {
            id: string;
            status: "accepted" | "declined" | "cancelled";
            respondedAt: Date;
        };
        chatId: string;
        conversationId: string;
        applicationId: number;
    }>;
}
