import { FilesService } from 'src/files/files.service';
import { ChatService } from './chat.service';
export declare class ChatsController {
    private readonly chatService;
    private readonly filesService;
    constructor(chatService: ChatService, filesService: FilesService);
    list(req: any, page?: number, limit?: number): Promise<{
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
    getMessages(chatId: number, page: number, limit: number, req: any): Promise<{
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
    sendMessage(chatId: number, body: any, req: any): Promise<{
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
    uploadAttachment(chatId: number, file: Express.Multer.File, req: any): Promise<{
        message: string;
        attachment: {
            fileName: string;
            fileUrl: string;
            contentType: string;
        };
    }>;
    markRead(chatId: number, req: any): Promise<{
        message: string;
    }>;
}
