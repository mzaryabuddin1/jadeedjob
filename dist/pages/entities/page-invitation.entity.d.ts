import { Page } from './page.entity';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export declare class PageInvitation {
    id: number;
    pageId: number;
    page: Page;
    invitedUserId: number;
    invitedBy: number;
    role: 'admin' | 'editor';
    status: InvitationStatus;
    expiresAt: Date;
    respondedAt: Date | null;
    createdAt: Date;
}
