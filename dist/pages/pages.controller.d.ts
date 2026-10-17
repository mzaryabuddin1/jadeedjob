import { PagesService } from './pages.service';
import { PageInvitationsService } from './page-invitations.service';
import { PageVerificationService } from './page-verification.service';
export declare class PagesController {
    private readonly pagesService;
    private readonly invitations;
    private readonly verification;
    constructor(pagesService: PagesService, invitations: PageInvitationsService, verification: PageVerificationService);
    roles(): {
        assignable: ("owner" | "admin" | "editor")[];
        roles: {
            [k: string]: readonly ("page.edit" | "page.delete" | "members.view" | "members.invite" | "members.remove" | "members.change_role" | "jobs.manage" | "applications.manage" | "ratings.give" | "verification.submit" | "verification.view")[];
        };
        allPermissions: readonly ["page.edit", "page.delete", "members.view", "members.invite", "members.remove", "members.change_role", "jobs.manage", "applications.manage", "ratings.give", "verification.submit", "verification.view"];
        rules: string[];
    };
    myInvitations(req: any): Promise<{
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
    acceptInvitation(invitationId: number, req: any): Promise<{
        message: string;
        data: {
            pageId: number;
            role: "admin" | "editor";
        };
    }>;
    declineInvitation(invitationId: number, req: any): Promise<{
        message: string;
    }>;
    createPage(body: any, req: any): Promise<{
        message: string;
        data: Record<string, any>;
    }>;
    getPages(query: any, req: any): Promise<{
        data: Record<string, any>[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getPageById(id: number, req: any): Promise<Record<string, any>>;
    updatePage(id: number, body: any, req: any): Promise<{
        message: string;
        data: Record<string, any>;
    }>;
    deletePage(id: number, req: any): Promise<{
        message: string;
    }>;
    members(pageId: number, req: any): Promise<{
        isOwner: boolean;
        name: string;
        username: string;
        profile_photo: string;
        userId: number;
        role: "owner" | "admin" | "editor";
        joinedAt: Date;
    }[]>;
    addMember(pageId: number, body: any, req: any): Promise<{
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
    changeMemberRole(pageId: number, userId: number, body: any, req: any): Promise<{
        message: string;
        data: {
            pageId: number;
            userId: number;
            role: "admin" | "editor";
        };
    }>;
    leave(pageId: number, req: any): Promise<{
        message: string;
    }>;
    removeMember(pageId: number, userId: number, req: any): Promise<{
        message: string;
    }>;
    invite(pageId: number, body: any, req: any): Promise<{
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
    pageInvitations(pageId: number, req: any): Promise<{
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
    cancelInvitation(pageId: number, invitationId: number, req: any): Promise<{
        message: string;
    }>;
    submitVerification(pageId: number, files: Express.Multer.File[] | undefined, body: {
        documentTypes?: string;
        notes?: string;
    }, req: any): Promise<{
        message: string;
        data: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            notes: string;
            rejectionReason: string;
            createdAt: Date;
            reviewedAt: Date;
            documents: {
                type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
                name: string;
                size: number;
            }[];
        };
    }>;
    verificationStatus(pageId: number, req: any): Promise<{
        is_verified: boolean;
        verified_at: Date;
        status: "pending" | "rejected" | "none" | "verified";
        latest: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            notes: string;
            rejectionReason: string;
            createdAt: Date;
            reviewedAt: Date;
            documents: {
                type: "business_license" | "registration_certificate" | "tax_document" | "id_proof" | "utility_bill" | "other";
                name: string;
                size: number;
            }[];
        };
        history: {
            id: number;
            status: import("./entities/page-verification.entity").VerificationRequestStatus;
            createdAt: Date;
            reviewedAt: Date;
            rejectionReason: string;
        }[];
        documentTypes: readonly ["business_license", "registration_certificate", "tax_document", "id_proof", "utility_bill", "other"];
    }>;
}
