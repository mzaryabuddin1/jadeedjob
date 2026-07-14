import { Repository } from 'typeorm';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import { SupportTicket, SupportTicketCategory, SupportTicketKind } from './entities/support-ticket.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';
export declare class SupportService {
    private readonly contactMessageRepo;
    private readonly ticketRepo;
    private readonly attachmentRepo;
    private readonly notificationsService;
    constructor(contactMessageRepo: Repository<SupportContactMessage>, ticketRepo: Repository<SupportTicket>, attachmentRepo: Repository<SupportTicketAttachment>, notificationsService: NotificationsService);
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
        message: string;
        preferredContact?: string;
        contact?: string;
        attachments?: string[];
    }): Promise<{
        ticketId: number;
        status: string;
        createdAt: Date;
        message: string;
    }>;
    listTickets(userId: number, page?: number, limit?: number): Promise<{
        data: {
            ticketId: number;
            kind: SupportTicketKind;
            category: SupportTicketCategory;
            message: string;
            preferredContact: string;
            contact: string;
            status: string;
            attachments: string[];
            uploadedAttachments: {
                id: number;
                fileName: string;
                fileUrl: string;
                contentType: string;
                createdAt: Date;
            }[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    addAttachment(userId: number, ticketId: number, file: {
        filename: string;
        mimetype?: string;
    }, fileUrl: string): Promise<{
        ticketId: number;
        status: string;
        createdAt: Date;
        message: string;
        attachment: {
            id: number;
            fileName: string;
            fileUrl: string;
            contentType: string;
            createdAt: Date;
        };
    }>;
    private formatTicketResponse;
    private formatTicket;
}
