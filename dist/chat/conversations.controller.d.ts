import { ConversationsService, OpenDto } from './conversations.service';
import { MessagesService } from './messages.service';
export declare class ConversationsController {
    private readonly conversations;
    private readonly messages;
    constructor(conversations: ConversationsService, messages: MessagesService);
    open(body: OpenDto, req: any): Promise<{
        id: number;
        type: import("./entities/conversation.entity").ConversationType;
        role: string;
        job: {
            id: number;
            title: string;
            isActive: boolean;
            page: {
                id: number;
                page_name: string;
                page_logo: string;
                is_verified: boolean;
            };
        };
        other: Record<string, unknown>;
        lastMessage: {
            id: number;
            senderId: number;
            messageType: import("./entities/conversation-message.entity").MessageType;
            content: string;
            mediaUrl: string;
            deleted: boolean;
            createdAt: Date;
        };
        unreadCount: number;
        muted: boolean;
        mutedUntil: Date;
        blocked: {
            byMe: boolean;
            byThem: boolean;
        };
        createdAt: Date;
        lastMessageAt: Date;
    }>;
    list(page: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            type: import("./entities/conversation.entity").ConversationType;
            role: string;
            job: {
                id: number;
                title: string;
                isActive: boolean;
                page: {
                    id: number;
                    page_name: string;
                    page_logo: string;
                    is_verified: boolean;
                };
            };
            other: Record<string, unknown>;
            lastMessage: {
                id: number;
                senderId: number;
                messageType: import("./entities/conversation-message.entity").MessageType;
                content: string;
                mediaUrl: string;
                deleted: boolean;
                createdAt: Date;
            };
            unreadCount: number;
            muted: boolean;
            mutedUntil: Date;
            blocked: {
                byMe: boolean;
                byThem: boolean;
            };
            createdAt: Date;
            lastMessageAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    unread(req: any): Promise<{
        unreadMessages: number;
        unreadConversations: number;
    }>;
    blocks(req: any): Promise<{
        id: number;
        blockedAt: Date;
        name: string;
        username: string;
        profile_photo: string;
    }[]>;
    block(userId: number, req: any): Promise<{
        blocked: boolean;
    }>;
    unblock(userId: number, req: any): Promise<{
        blocked: boolean;
    }>;
    get(id: number, req: any): Promise<{
        id: number;
        type: import("./entities/conversation.entity").ConversationType;
        role: string;
        job: {
            id: number;
            title: string;
            isActive: boolean;
            page: {
                id: number;
                page_name: string;
                page_logo: string;
                is_verified: boolean;
            };
        };
        other: Record<string, unknown>;
        lastMessage: {
            id: number;
            senderId: number;
            messageType: import("./entities/conversation-message.entity").MessageType;
            content: string;
            mediaUrl: string;
            deleted: boolean;
            createdAt: Date;
        };
        unreadCount: number;
        muted: boolean;
        mutedUntil: Date;
        blocked: {
            byMe: boolean;
            byThem: boolean;
        };
        createdAt: Date;
        lastMessageAt: Date;
    }>;
    listMessages(id: number, before: string, after: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            conversationId: number;
            senderId: number;
            messageType: import("./entities/conversation-message.entity").MessageType;
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
            messageType: import("./entities/conversation-message.entity").MessageType;
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
    send(id: number, body: any, req: any): Promise<{
        id: number;
        conversationId: number;
        senderId: number;
        messageType: import("./entities/conversation-message.entity").MessageType;
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
        messageType: import("./entities/conversation-message.entity").MessageType;
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
    read(id: number, body: {
        messageId?: number;
    }, req: any): Promise<{
        conversationId: number;
        lastReadMessageId: number;
    }>;
    mute(id: number, body: {
        muted: boolean;
        hours?: number;
    }, req: any): Promise<{
        muted: boolean;
        mutedUntil: Date;
    }>;
    remove(id: number, req: any): Promise<{
        message: string;
    }>;
}
