import { ChatService } from './chat.service';
export declare class ProfileChatOptionsController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getChatOptions(profileType: string, profileId: number, req: any): Promise<{
        unavailableReason?: string;
        available: boolean;
        action: string;
        jobs: {
            id: string;
            title: string;
        }[];
    }>;
}
