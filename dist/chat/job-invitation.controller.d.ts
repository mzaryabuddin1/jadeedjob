import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
export declare class JobInvitationController {
    private readonly chatService;
    private readonly chatGateway;
    constructor(chatService: ChatService, chatGateway: ChatGateway);
    updateInvitation(id: string, body: {
        action: 'accept' | 'decline' | 'cancel';
    }, req: any): Promise<{
        invitation: {
            id: string;
            invitationId: string;
            status: "accepted" | "declined" | "cancelled";
            viewerAction: "respond" | "cancel";
            respondedAt: Date;
        };
        chatId: string;
        conversationId: string;
        applicationId: number;
    }>;
}
