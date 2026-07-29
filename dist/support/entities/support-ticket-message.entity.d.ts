import { SupportTicket } from './support-ticket.entity';
import { User } from 'src/users/entities/user.entity';
export declare class SupportTicketMessage {
    id: number;
    ticketId: number;
    ticket: SupportTicket;
    sender: 'user' | 'support';
    senderUserId: number;
    senderUser: User;
    body: string;
    attachments: Array<{
        fileUrl: string;
        fileName?: string;
        contentType?: string;
        assetId?: string;
    }>;
    createdAt: Date;
}
