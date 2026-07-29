import { SupportService } from './support.service';
export declare class AdminSupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
    list(query: any): Promise<{
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
    get(id: number): Promise<{
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
    reply(id: number, req: any, body: {
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
    updateStatus(id: number, body: any): Promise<{
        message: string;
        ticketId: number;
        status: string;
    }>;
}
