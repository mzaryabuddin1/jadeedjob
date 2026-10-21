import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { UserBlock } from './entities/user-block.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { Page } from 'src/pages/entities/page.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { ChatEvents } from './chat-events.service';
export type OpenDto = {
    type: 'direct';
    userId: number;
} | {
    type: 'job';
    jobId: number;
    userId?: number;
};
export declare const personView: (u: User | undefined | null) => {
    id: number;
    name: string;
    username: string;
    profile_photo: string;
};
export declare class ConversationsService {
    private readonly convRepo;
    private readonly memberRepo;
    private readonly msgRepo;
    private readonly blockRepo;
    private readonly userRepo;
    private readonly jobRepo;
    private readonly pageRepo;
    private readonly appRepo;
    private readonly events;
    constructor(convRepo: Repository<Conversation>, memberRepo: Repository<ConversationMember>, msgRepo: Repository<ConversationMessage>, blockRepo: Repository<UserBlock>, userRepo: Repository<User>, jobRepo: Repository<Job>, pageRepo: Repository<Page>, appRepo: Repository<JobApplication>, events: ChatEvents);
    open(userId: number, dto: OpenDto): Promise<{
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
    getOrCreate(userId: number, dto: OpenDto, opts?: {
        allowInactive?: boolean;
    }): Promise<Conversation>;
    private getOrCreateDirect;
    private getOrCreateJobChat;
    private insertConversation;
    private addMembers;
    private assertDmQuota;
    hasAccess(conv: Conversation, userId: number): Promise<boolean>;
    requireAccess(conversationId: number, userId: number): Promise<{
        conv: Conversation;
        member: ConversationMember;
    }>;
    audience(conv: Conversation): Promise<number[]>;
    recipientsFor(conv: Conversation, senderId: number): Promise<number[]>;
    private team;
    blockedBetween(a: number, b: number): Promise<{
        byMe: boolean;
        byThem: boolean;
    }>;
    assertNotBlocked(a: number, b: number): Promise<void>;
    private assertCanContact;
    assertCanSend(conv: Conversation, senderId: number): Promise<void>;
    block(userId: number, targetId: number): Promise<{
        blocked: boolean;
    }>;
    unblock(userId: number, targetId: number): Promise<{
        blocked: boolean;
    }>;
    listBlocks(userId: number): Promise<{
        id: number;
        blockedAt: Date;
        name: string;
        username: string;
        profile_photo: string;
    }[]>;
    list(userId: number, opts: {
        page?: number;
        limit?: number;
    }): Promise<{
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
    view(conv: Conversation, userId: number): Promise<{
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
    get(userId: number, conversationId: number): Promise<{
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
    private views;
    private unreadByConversation;
    unreadTotal(userId: number): Promise<{
        unreadMessages: number;
        unreadConversations: number;
    }>;
    markRead(userId: number, conversationId: number, messageId?: number): Promise<{
        conversationId: number;
        lastReadMessageId: number;
    }>;
    mute(userId: number, conversationId: number, muted: boolean, hours?: number): Promise<{
        muted: boolean;
        mutedUntil: Date;
    }>;
    usersById(ids: number[]): Promise<Map<number, User>>;
}
