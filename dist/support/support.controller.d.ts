import { SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
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
    listTickets(req: any, query: any): Promise<{
        data: {
            ticketId: number;
            kind: import("./entities/support-ticket.entity").SupportTicketKind;
            category: import("./entities/support-ticket.entity").SupportTicketCategory;
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
    getTicket(req: any, id: number): Promise<{
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
            kind: import("./entities/support-ticket.entity").SupportTicketKind;
            category: import("./entities/support-ticket.entity").SupportTicketCategory;
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
    getMessages(req: any, id: number, query: any): Promise<{
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
    addMessage(req: any, id: number, body: {
        message: string;
    }): Promise<{
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
    addAttachment(req: any, id: number, file: Express.Multer.File): Promise<{
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
}
