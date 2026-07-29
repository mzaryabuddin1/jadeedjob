import { SupportTicket } from './support-ticket.entity';
export declare class SupportTicketAttachment {
    id: number;
    ticketId: number;
    ticket: SupportTicket;
    fileName: string;
    fileUrl: string;
    assetId: string;
    contentType: string;
    createdAt: Date;
}
