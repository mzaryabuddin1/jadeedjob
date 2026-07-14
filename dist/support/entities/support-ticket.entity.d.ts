import { User } from 'src/users/entities/user.entity';
import { SupportTicketAttachment } from './support-ticket-attachment.entity';
export type SupportTicketKind = 'feedback' | 'complaint';
export type SupportTicketCategory = 'app' | 'payment' | 'job_post' | 'worker' | 'chat' | 'suggestion' | 'other';
export declare class SupportTicket {
    id: number;
    userId: number;
    user: User;
    kind: SupportTicketKind;
    category: SupportTicketCategory;
    message: string;
    preferredContact: string;
    contact: string;
    status: string;
    attachments: string[];
    uploadedAttachments: SupportTicketAttachment[];
    createdAt: Date;
    updatedAt: Date;
}
