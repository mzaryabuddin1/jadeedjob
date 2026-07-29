import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';
export declare class ChatParticipant {
    id: number;
    conversationId: string;
    conversation: ChatConversation;
    userId: number;
    user: User;
    active: boolean;
    createdAt: Date;
}
