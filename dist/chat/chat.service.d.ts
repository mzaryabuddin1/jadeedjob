import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
export declare class ChatService {
    private readonly messageRepo;
    private readonly appRepo;
    private readonly jobRepo;
    private readonly userRepo;
    private readonly pageMemberRepo;
    private readonly notificationsService;
    constructor(messageRepo: Repository<ChatMessage>, appRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>, pageMemberRepo: Repository<PageMember>, notificationsService: NotificationsService);
    userCanAccessApplication(userId: number, appId: number): Promise<boolean>;
    listChats(userId: number, page?: number, limit?: number): Promise<{
        data: {
            chatId: number;
            jobId: number;
            applicationId: number;
            participant: {
                id: number;
                name: string;
                avatarUrl: string;
            };
            job: {
                id: number;
                title: string;
                companyName: string;
            };
            lastMessage: {
                id: number;
                chatId: number;
                jobApplicationId: number;
                senderId: number;
                senderName: string;
                senderAvatar: string;
                text: string;
                attachments: {
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                }[];
                messageType: string;
                createdAt: Date;
                readAt: Date;
            };
            unreadCount: number;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    sendMessage(senderId: number, dto: SendMessageDto & any): Promise<{
        id: number;
        chatId: number;
        jobApplicationId: number;
        senderId: number;
        senderName: string;
        senderAvatar: string;
        text: string;
        attachments: {
            fileUrl: string;
            fileName?: string;
            contentType?: string;
        }[];
        messageType: string;
        createdAt: Date;
        readAt: Date;
    }>;
    getMessages(jobApplicationId: number, userId: number, page?: number, limit?: number): Promise<{
        data: {
            id: number;
            chatId: number;
            jobApplicationId: number;
            senderId: number;
            senderName: string;
            senderAvatar: string;
            text: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
            }[];
            messageType: string;
            createdAt: Date;
            readAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    markRead(jobApplicationId: number, userId: number): Promise<{
        message: string;
    }>;
    formatUploadedAttachment(file: Express.Multer.File, fileUrl: string): {
        fileName: string;
        fileUrl: string;
        contentType: string;
    };
    private formatChatSummary;
    private formatMessage;
}
