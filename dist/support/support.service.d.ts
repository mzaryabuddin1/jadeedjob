import { Repository } from 'typeorm';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { User } from 'src/users/entities/user.entity';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import { SupportTicket, SupportTicketCategory, SupportTicketKind } from './entities/support-ticket.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
export declare class SupportService {
    private readonly contactMessageRepo;
    private readonly ticketRepo;
    private readonly attachmentRepo;
    private readonly messageRepo;
    private readonly userRepo;
    private readonly notificationsService;
    private readonly storageService;
    private readonly idempotencyService;
    constructor(contactMessageRepo: Repository<SupportContactMessage>, ticketRepo: Repository<SupportTicket>, attachmentRepo: Repository<SupportTicketAttachment>, messageRepo: Repository<SupportTicketMessage>, userRepo: Repository<User>, notificationsService: NotificationsService, storageService: ObjectStorageService, idempotencyService: IdempotencyService);
    getContactInfo(): {
        phoneDisplay: string;
        phone: string;
        whatsapp: string;
        email: string;
    };
    createContactMessage(userId: number, body: any): Promise<{
        id: number;
        status: string;
        createdAt: Date;
        message: string;
    }>;
    createTicket(userId: number, body: {
        kind: SupportTicketKind;
        category: SupportTicketCategory;
        subject?: string;
        message: string;
        preferredContact?: string;
        contact?: string;
        attachments?: string[];
    }, idempotencyKey?: string): Promise<{
        ticketId: number;
        status: string;
        createdAt: Date;
        message: string;
    }>;
    private createTicketInternal;
    listTickets(userId: number, page?: number, limit?: number): Promise<{
        data: {
            ticketId: number;
            kind: SupportTicketKind;
            category: SupportTicketCategory;
            subject: string;
            message: string;
            preferredContact: string;
            contact: string;
            status: string;
            attachments: {
                id: number;
                assetId: string;
                fileName: string;
                fileUrl: string;
                contentType: string;
                createdAt: Date;
            }[];
            latestMessage: {
                id: number;
                ticketId: number;
                sender: "user" | "support";
                body: string;
                attachments: {
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                    assetId?: string;
                }[];
                createdAt: Date;
            };
            user: {
                id: number;
                name: string;
                phone: string;
            };
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getTicket(ticketId: number, userId: number): Promise<{
        messages: {
            id: number;
            ticketId: number;
            sender: "user" | "support";
            body: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                assetId?: string;
            }[];
            createdAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
        ticket: {
            ticketId: number;
            kind: SupportTicketKind;
            category: SupportTicketCategory;
            subject: string;
            message: string;
            preferredContact: string;
            contact: string;
            status: string;
            attachments: {
                id: number;
                assetId: string;
                fileName: string;
                fileUrl: string;
                contentType: string;
                createdAt: Date;
            }[];
            latestMessage: {
                id: number;
                ticketId: number;
                sender: "user" | "support";
                body: string;
                attachments: {
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                    assetId?: string;
                }[];
                createdAt: Date;
            };
            user: {
                id: number;
                name: string;
                phone: string;
            };
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getMessages(ticketId: number, userId: number, page?: number, limit?: number): Promise<{
        messages: {
            id: number;
            ticketId: number;
            sender: "user" | "support";
            body: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                assetId?: string;
            }[];
            createdAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    addMessage(ticketId: number, senderUserId: number, sender: 'user' | 'support', body: string): Promise<{
        message: {
            id: number;
            ticketId: number;
            sender: "user" | "support";
            body: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                assetId?: string;
            }[];
            createdAt: Date;
        };
    }>;
    addAttachment(userId: number, ticketId: number, file: Express.Multer.File): Promise<{
        ticketId: number;
        status: string;
        createdAt: Date;
        message: string;
        attachment: {
            id: number;
            assetId: string;
            fileName: string;
            fileUrl: string;
            contentType: string;
            createdAt: Date;
        };
        threadMessage: {
            id: number;
            ticketId: number;
            sender: "user" | "support";
            body: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                assetId?: string;
            }[];
            createdAt: Date;
        };
    }>;
    listAdminTickets(query: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            ticketId: number;
            kind: SupportTicketKind;
            category: SupportTicketCategory;
            subject: string;
            message: string;
            preferredContact: string;
            contact: string;
            status: string;
            attachments: {
                id: number;
                assetId: string;
                fileName: string;
                fileUrl: string;
                contentType: string;
                createdAt: Date;
            }[];
            latestMessage: {
                id: number;
                ticketId: number;
                sender: "user" | "support";
                body: string;
                attachments: {
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                    assetId?: string;
                }[];
                createdAt: Date;
            };
            user: {
                id: number;
                name: string;
                phone: string;
            };
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getAdminTicket(ticketId: number): Promise<{
        messages: {
            id: number;
            ticketId: number;
            sender: "user" | "support";
            body: string;
            attachments: {
                fileUrl: string;
                fileName?: string;
                contentType?: string;
                assetId?: string;
            }[];
            createdAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
        ticket: {
            ticketId: number;
            kind: SupportTicketKind;
            category: SupportTicketCategory;
            subject: string;
            message: string;
            preferredContact: string;
            contact: string;
            status: string;
            attachments: {
                id: number;
                assetId: string;
                fileName: string;
                fileUrl: string;
                contentType: string;
                createdAt: Date;
            }[];
            latestMessage: {
                id: number;
                ticketId: number;
                sender: "user" | "support";
                body: string;
                attachments: {
                    fileUrl: string;
                    fileName?: string;
                    contentType?: string;
                    assetId?: string;
                }[];
                createdAt: Date;
            };
            user: {
                id: number;
                name: string;
                phone: string;
            };
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    updateTicketStatus(ticketId: number, status: string): Promise<{
        message: string;
        ticketId: number;
        status: string;
    }>;
    private requireTicket;
    private listMessages;
    private formatTicketResponse;
    private formatTicket;
    private formatMessage;
    private formatAttachment;
    private defaultTicketSubject;
}
