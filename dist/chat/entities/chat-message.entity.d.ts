import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { ChatConversation } from './chat-conversation.entity';
export declare class ChatMessage {
    id: number;
    jobApplicationId: number;
    jobApplication: JobApplication;
    conversationId: string;
    conversation: ChatConversation;
    clientMessageId: string;
    senderId: number;
    sender: User;
    content: string;
    mediaUrl: string;
    attachments: Array<{
        assetId?: string;
        fileUrl: string;
        fileName?: string;
        contentType?: string;
        sizeBytes?: number;
    }>;
    messageType: string;
    readAt: Date;
    moderationStatus: 'visible' | 'hidden' | 'removed';
    createdAt: Date;
}
