import { ObjectStorageService } from 'src/storage/object-storage.service';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ModerationService } from 'src/moderation/moderation.service';
export declare class ChatsController {
    private readonly chatService;
    private readonly storageService;
    private readonly chatGateway;
    private readonly moderationService;
    constructor(chatService: ChatService, storageService: ObjectStorageService, chatGateway: ChatGateway, moderationService: ModerationService);
    list(req: any, query: {
        page: number;
        limit: number;
    }): Promise<{
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
    createContext(req: any, idempotencyKey: string, body: {
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
    getMessages(chatId: string, query: {
        before?: string;
        page: number;
        limit: number;
    }, req: any): Promise<{
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
    sendMessage(chatId: string, body: any, req: any): Promise<{
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
    uploadAttachment(chatId: string, file: Express.Multer.File, req: any): Promise<{
        message: string;
        attachment: {
            assetId: string;
            fileName: string;
            fileUrl: string;
            contentType: string;
            sizeBytes: number;
        };
    }>;
    markRead(chatId: string, req: any): Promise<{
        chatId: string;
        conversationId: string;
        lastReadMessageId: number;
        readAt: Date;
    }>;
    reportMessage(conversationId: string, messageId: number, body: any, req: any): Promise<{
        reportId: string;
        status: import("../moderation/entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
}
