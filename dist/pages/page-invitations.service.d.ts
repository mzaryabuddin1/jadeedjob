import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageMember } from './entities/page-member.entity';
import { PageInvitation } from './entities/page-invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';
import { PagesService } from './pages.service';
export declare class PageInvitationsService {
    private readonly inviteRepo;
    private readonly memberRepo;
    private readonly pageRepo;
    private readonly userRepo;
    private readonly pagesService;
    private readonly notificationService;
    constructor(inviteRepo: Repository<PageInvitation>, memberRepo: Repository<PageMember>, pageRepo: Repository<Page>, userRepo: Repository<User>, pagesService: PagesService, notificationService: NotificationService);
    private get validityDays();
    private displayName;
    invite(pageId: number, requesterId: number, target: {
        userId?: number;
        username?: string;
    }, role: 'admin' | 'editor'): Promise<{
        message: string;
        data: {
            id: number;
            status: import("./entities/page-invitation.entity").InvitationStatus;
            role: "admin" | "editor";
            expiresAt: Date;
            createdAt: Date;
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
            };
            invitedUser: {
                id: number;
                name: string;
                username: string;
            };
            invitedBy: {
                id: number;
                name: string;
                username: string;
            };
        };
    }>;
    listForPage(pageId: number, requesterId: number): Promise<{
        id: number;
        status: import("./entities/page-invitation.entity").InvitationStatus;
        role: "admin" | "editor";
        expiresAt: Date;
        createdAt: Date;
        page: {
            id: number;
            page_name: string;
            username: string;
            page_logo: string;
            is_verified: boolean;
        };
        invitedUser: {
            id: number;
            name: string;
            username: string;
        };
        invitedBy: {
            id: number;
            name: string;
            username: string;
        };
    }[]>;
    cancel(pageId: number, invitationId: number, requesterId: number): Promise<{
        message: string;
    }>;
    listMine(userId: number): Promise<{
        id: number;
        status: import("./entities/page-invitation.entity").InvitationStatus;
        role: "admin" | "editor";
        expiresAt: Date;
        createdAt: Date;
        page: {
            id: number;
            page_name: string;
            username: string;
            page_logo: string;
            is_verified: boolean;
        };
        invitedUser: {
            id: number;
            name: string;
            username: string;
        };
        invitedBy: {
            id: number;
            name: string;
            username: string;
        };
    }[]>;
    accept(invitationId: number, userId: number): Promise<{
        message: string;
        data: {
            pageId: number;
            role: "admin" | "editor";
        };
    }>;
    decline(invitationId: number, userId: number): Promise<{
        message: string;
    }>;
    private loadMine;
    private usersById;
    private toView;
}
