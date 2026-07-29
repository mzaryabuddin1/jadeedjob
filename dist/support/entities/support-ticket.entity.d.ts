import { User } from 'src/users/entities/user.entity';
import { SupportTicketAttachment } from './support-ticket-attachment.entity';
import { SupportTicketMessage } from './support-ticket-message.entity';
export type SupportTicketKind = 'feedback' | 'complaint';
export type SupportTicketCategory = 'app' | 'payment' | 'job_post' | 'worker' | 'chat' | 'suggestion' | 'other';
export declare class SupportTicket {
    id: number;
    userId: number;
    user: User;
    kind: SupportTicketKind;
    category: SupportTicketCategory;
    subject: string;
    message: string;
    preferredContact: string;
    contact: string;
    status: string;
    attachments: string[];
    uploadedAttachments: SupportTicketAttachment[];
    messages: SupportTicketMessage[];
    createdAt: Date;
    updatedAt: Date;
}
