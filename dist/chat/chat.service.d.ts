import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Page } from 'src/pages/entities/page.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
export declare class ChatService {
    private readonly appRepo;
    private readonly pageRepo;
    private readonly convRepo;
    private readonly msgRepo;
    private readonly conversations;
    private readonly messages;
    constructor(appRepo: Repository<JobApplication>, pageRepo: Repository<Page>, convRepo: Repository<Conversation>, msgRepo: Repository<ConversationMessage>, conversations: ConversationsService, messages: MessagesService);
    userCanAccessApplication(userId: number, appId: number): Promise<boolean>;
    private conversationOf;
    sendMessage(senderId: number, dto: SendMessageDto): Promise<{
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
    }>;
    getMessages(jobApplicationId: number, userId: number, page?: number, limit?: number): Promise<{
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
    private legacy;
}
