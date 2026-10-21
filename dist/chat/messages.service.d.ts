import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage, MessageType } from './entities/conversation-message.entity';
import { ConversationsService } from './conversations.service';
import { ChatEvents } from './chat-events.service';
import { ChatNotifier } from './chat-notifier';
export declare const MESSAGE_TEXT_MAX = 1000;
export type SendDto = {
    content?: string;
    mediaUrl?: string;
    messageType?: MessageType;
    clientMsgId?: string;
};
export declare class MessagesService {
    private readonly convRepo;
    private readonly memberRepo;
    private readonly msgRepo;
    private readonly conversations;
    private readonly events;
    private readonly notifier;
    private readonly recent;
    constructor(convRepo: Repository<Conversation>, memberRepo: Repository<ConversationMember>, msgRepo: Repository<ConversationMessage>, conversations: ConversationsService, events: ChatEvents, notifier: ChatNotifier);
    send(userId: number, conversationId: number, dto: SendDto): Promise<{
        id: number;
        conversationId: number;
        senderId: number;
        messageType: MessageType;
        content: string;
        mediaUrl: string;
        clientMsgId: string;
        deleted: boolean;
        createdAt: Date;
        sender: {
            id: number;
            name: string;
            username: string;
            profile_photo: string;
        };
    } | {
        duplicate: boolean;
        id: number;
        conversationId: number;
        senderId: number;
        messageType: MessageType;
        content: string;
        mediaUrl: string;
        clientMsgId: string;
        deleted: boolean;
        createdAt: Date;
        sender: {
            id: number;
            name: string;
            username: string;
            profile_photo: string;
        };
    }>;
    private checkRate;
    list(userId: number, conversationId: number, opts: {
        before?: number;
        after?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            conversationId: number;
            senderId: number;
            messageType: MessageType;
            content: string;
            mediaUrl: string;
            clientMsgId: string;
            deleted: boolean;
            createdAt: Date;
            sender: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
            };
        }[];
        nextCursor: any;
        hasMore: boolean;
        lastId: number;
    } | {
        data: {
            id: number;
            conversationId: number;
            senderId: number;
            messageType: MessageType;
            content: string;
            mediaUrl: string;
            clientMsgId: string;
            deleted: boolean;
            createdAt: Date;
            sender: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
            };
        }[];
        nextCursor: number;
        hasMore: boolean;
        lastId?: undefined;
    }>;
    remove(userId: number, messageId: number): Promise<{
        message: string;
    }>;
    views(messages: ConversationMessage[]): Promise<{
        id: number;
        conversationId: number;
        senderId: number;
        messageType: MessageType;
        content: string;
        mediaUrl: string;
        clientMsgId: string;
        deleted: boolean;
        createdAt: Date;
        sender: {
            id: number;
            name: string;
            username: string;
            profile_photo: string;
        };
    }[]>;
}
