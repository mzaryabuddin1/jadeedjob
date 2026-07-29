import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';
export declare class ChatReadState {
    id: number;
    conversationId: string;
    conversation: ChatConversation;
    userId: number;
    user: User;
    lastReadMessageId: number;
    readAt: Date;
    updatedAt: Date;
}
