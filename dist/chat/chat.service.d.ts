import { EntityManager, Repository } from 'typeorm';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { ModerationService } from 'src/moderation/moderation.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { JobInvitation } from './entities/job-invitation.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';
type MessageInput = {
    content?: string;
    text?: string;
    mediaUrl?: string;
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
    attachments?: Array<{
        assetId?: string;
        fileUrl?: string;
        fileName?: string;
        contentType?: string;
        sizeBytes?: number;
    }>;
    clientMessageId?: string;
};
export declare class ChatService {
    private readonly messageRepo;
    private readonly conversationRepo;
    private readonly participantRepo;
    private readonly readRepo;
    private readonly invitationRepo;
    private readonly appRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly pageMemberRepo;
    private readonly companyRepo;
    private readonly notificationsService;
    private readonly moderationService;
    private readonly idempotencyService;
    private readonly objectStorageService;
    constructor(messageRepo: Repository<ChatMessage>, conversationRepo: Repository<ChatConversation>, participantRepo: Repository<ChatParticipant>, readRepo: Repository<ChatReadState>, invitationRepo: Repository<JobInvitation>, appRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>, pageMemberRepo: Repository<PageMember>, companyRepo: Repository<CompanyPage>, notificationsService: NotificationsService, moderationService: ModerationService, idempotencyService: IdempotencyService, objectStorageService: ObjectStorageService);
    ensureApplicationConversation(applicationId: number, manager?: EntityManager): Promise<ChatConversation>;
    resolveConversation(reference: string | number): Promise<ChatConversation>;
    userCanAccessApplication(userId: number, applicationId: number): Promise<boolean>;
    canWriteConversation(userId: number, reference: string | number): Promise<boolean>;
    assertCanJoinConversation(userId: number, reference: string | number): Promise<ChatConversation>;
    realtimeAudienceIds(reference: string | number): Promise<{
        conversationId: string;
        userIds: number[];
    }>;
    listChats(userId: number, page?: number, limit?: number): Promise<{
        data: {
            chatId: string;
            conversationId: string;
            legacyApplicationChatId: number;
            type: "application" | "inquiry" | "invitation";
            jobId: number;
            applicationId: number;
            participant: {
                id: number;
                type: string;
                name: string;
                avatarUrl: string;
            };
            job: {
                id: number;
                title: string;
                companyName: string;
            };
            invitation: {
                id: any;
                invitationId: any;
                status: any;
                viewerAction: "respond" | "cancel";
            };
            lastMessage: {
                id: number;
                chatId: string;
                conversationId: string;
                jobApplicationId: number;
                clientMessageId: string;
                senderId: number;
                senderName: string;
                senderAvatar: string;
                text: string;
                attachments: {
                    assetId?: string;
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                    sizeBytes?: number;
                }[];
                messageType: string;
                createdAt: Date;
                readAt: Date;
            };
            unreadCount: number;
            readOnly: boolean;
            readOnlyReason: string;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getMessages(reference: string | number, userId: number, pageOrBefore?: number | string, limit?: number): Promise<{
        data: {
            id: number;
            chatId: string;
            conversationId: string;
            jobApplicationId: number;
            clientMessageId: string;
            senderId: number;
            senderName: string;
            senderAvatar: string;
            text: string;
            attachments: {
                assetId?: string;
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                sizeBytes?: number;
            }[];
            messageType: string;
            createdAt: Date;
            readAt: Date;
        }[];
        nextBefore: string;
        total: number;
        totalPages: number;
        currentPage: number;
        readOnly: boolean;
        readOnlyReason: string;
    }>;
    sendMessage(senderId: number, input: (MessageInput & {
        conversationId: string | number;
    }) | (MessageInput & {
        jobApplicationId: number;
    })): Promise<{
        id: number;
        chatId: string;
        conversationId: string;
        jobApplicationId: number;
        clientMessageId: string;
        senderId: number;
        senderName: string;
        senderAvatar: string;
        text: string;
        attachments: {
            assetId?: string;
            fileUrl: string;
            fileName?: string;
            contentType?: string;
            sizeBytes?: number;
        }[];
        messageType: string;
        createdAt: Date;
        readAt: Date;
    }>;
    markRead(reference: string | number, userId: number): Promise<{
        chatId: string;
        conversationId: string;
        lastReadMessageId: number;
        readAt: Date;
    }>;
    getReportableMessage(reference: string | number, messageId: number, userId: number): Promise<{
        targetType: "chat_message";
        targetId: string;
        targetOwnerUserId: number;
        targetCompanyId: number;
        snapshot: {
            conversationId: string;
            messageId: string;
            senderId: string;
            content: string;
            attachments: {
                assetId?: string;
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                sizeBytes?: number;
            }[];
            createdAt: Date;
        };
    }>;
    getChatOptions(viewerId: number, profileType: string, profileId: number): Promise<{
        unavailableReason?: string;
        available: boolean;
        action: string;
        jobs: {
            id: string;
            title: string;
        }[];
    }>;
    createContext(userId: number, input: {
        action: 'invite' | 'inquiry';
        profileType: 'user' | 'company';
        profileId: string | number;
        jobId: string | number;
        clientRequestId: string;
    }): Promise<{
        chatId: string;
        conversationId: string;
        jobId: string;
        jobTitle: string;
        participantId: string;
        invitation: {
            id: string;
            invitationId: string;
            status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
            viewerAction: "respond" | "cancel";
        };
    }>;
    updateInvitation(invitationId: string, userId: number, action: 'accept' | 'decline' | 'cancel'): Promise<{
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
    syncApplicationConversation(applicationId: number, status: string): Promise<void>;
    formatUploadedAttachment(file: Express.Multer.File, fileUrl: string): {
        fileName: string;
        fileUrl: string;
        contentType: string;
    };
    private createContextInternal;
    private acceptInvitationApplication;
    private canAccess;
    private assertCanMutate;
    private isWritable;
    private applicationWritable;
    private conversationBlocked;
    private companyPermission;
    private companyChatIds;
    private canManageJobForChat;
    private findManagedActiveJobs;
    private findContextConversation;
    private recipientIds;
    private formatConversationSummary;
    private formatMessage;
    private normalizeAttachments;
    private normalizeLegacyMediaUrl;
    private isPersistedLegacyAttachment;
    private contextResponse;
    invitationRealtimePayloads(invitationId: string): Promise<{
        userId: number;
        conversationId: string;
        payload: {
            chatId: string;
            conversationId: string;
            invitation: {
                id: string;
                invitationId: string;
                status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
                viewerAction: "respond" | "cancel";
            };
        };
    }[]>;
    private invitationViewerAction;
    private userName;
}
export {};
