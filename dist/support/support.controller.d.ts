import { FilesService } from 'src/files/files.service';
import { SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    private readonly filesService;
    constructor(supportService: SupportService, filesService: FilesService);
    getContactInfo(): {
        phoneDisplay: string;
        phone: string;
        whatsapp: string;
        email: string;
    };
    createContactMessage(req: any, body: any): Promise<{
        id: number;
        status: string;
        createdAt: Date;
        message: string;
    }>;
    createTicket(req: any, body: any): Promise<{
        ticketId: number;
        status: string;
        createdAt: Date;
        message: string;
    }>;
    listTickets(req: any, page?: number, limit?: number): Promise<{
        data: {
            ticketId: number;
            kind: import("./entities/support-ticket.entity").SupportTicketKind;
            category: import("./entities/support-ticket.entity").SupportTicketCategory;
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
    addAttachment(req: any, id: number, file: Express.Multer.File): Promise<{
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
}
