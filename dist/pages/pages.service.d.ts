import { Repository } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyBranch } from './entities/company-branch.entity';
import { CompanyPermissionKey, CompanyPermissions } from './company-permissions';
import { CompanyAccessRequest } from './entities/company-access-request.entity';
import { CompanyVerificationReview } from './entities/company-verification-review.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AuthService } from 'src/auth/auth.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { ModerationService } from 'src/moderation/moderation.service';
export declare class PagesService {
    private readonly pageRepo;
    private readonly memberRepo;
    private readonly userRepo;
    private readonly branchRepo;
    private readonly accessRequestRepo;
    private readonly verificationReviewRepo;
    private readonly storageService;
    private readonly notificationsService;
    private readonly authService;
    private readonly idempotencyService;
    private readonly moderationService;
    constructor(pageRepo: Repository<CompanyPage>, memberRepo: Repository<PageMember>, userRepo: Repository<User>, branchRepo: Repository<CompanyBranch>, accessRequestRepo: Repository<CompanyAccessRequest>, verificationReviewRepo: Repository<CompanyVerificationReview>, storageService: ObjectStorageService, notificationsService: NotificationsService, authService: AuthService, idempotencyService: IdempotencyService, moderationService: ModerationService);
    getDefaultPermissions(role: 'owner' | 'admin' | 'editor'): CompanyPermissions;
    normalizePermissions(role: 'owner' | 'admin' | 'editor', permissions?: Partial<CompanyPermissions> | null): CompanyPermissions;
    private memberForUser;
    getCompanyAccess(companyId: number, userId: number, permission?: CompanyPermissionKey): Promise<{
        page: CompanyPage;
        member: PageMember | {
            id: number;
            userId: number;
            role: "owner";
            hasAccess: boolean;
            permissions: CompanyPermissions;
        };
        permissions: CompanyPermissions;
    }>;
    assertCompanyCanPublish(companyId: number, userId: number): Promise<{
        page: CompanyPage;
        member: PageMember | {
            id: number;
            userId: number;
            role: "owner";
            hasAccess: boolean;
            permissions: CompanyPermissions;
        };
        permissions: CompanyPermissions;
    }>;
    private formatBranch;
    private formatCompany;
    private formatLegacyPublicCompany;
    private formatLegacyManagedCompany;
    private formatMember;
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: CompanyPage;
    }>;
    getPages(query: any, userId: number): Promise<{
        data: {
            association: string;
            id: number;
            company_name: string;
            business_name: string;
            username: string;
            company_logo: string;
            website_url: string;
            industry_type: string;
            company_description: string;
            founded_year: number;
            country: string;
            state: string;
            city: string;
            company_type: string;
            linkedin_page_url: string;
            facebook_page_url: string;
            instagram_page_url: string;
            twitter_page_url: string;
            youtube_channel_url: string;
            number_of_employees: number;
            certifications: string[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verified: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    addMember(pageId: number, targetUserId: number, role: 'admin' | 'editor', requesterId: number): Promise<{
        message: string;
        data: {
            pageId: number;
            userId: number;
            role: "admin" | "editor";
        };
    }>;
    getPageById(id: number, viewerId: number): Promise<{
        id: number;
        company_name: string;
        business_name: string;
        username: string;
        company_logo: string;
        website_url: string;
        industry_type: string;
        company_description: string;
        founded_year: number;
        country: string;
        state: string;
        city: string;
        company_type: string;
        linkedin_page_url: string;
        facebook_page_url: string;
        instagram_page_url: string;
        twitter_page_url: string;
        youtube_channel_url: string;
        number_of_employees: number;
        certifications: string[];
        verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
        verified: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: {
            official_email: string;
            official_phone: string;
            postal_code: string;
            address_line1: string;
            address_line2: string;
            google_maps_link: string;
            business_registration_number: string;
            tax_identification_number: string;
            registration_authority: string;
            business_license_document: string;
            representative_name: string;
            representative_designation: string;
            representative_email: string;
            representative_phone: string;
            id_proof_document: string;
            verified_email_domain: string;
            annual_revenue_range: string;
            client_list: string[];
            verificationReason: string;
            verifiedAt: Date;
            id: number;
            company_name: string;
            business_name: string;
            username: string;
            company_logo: string;
            website_url: string;
            industry_type: string;
            company_description: string;
            founded_year: number;
            country: string;
            state: string;
            city: string;
            company_type: string;
            linkedin_page_url: string;
            facebook_page_url: string;
            instagram_page_url: string;
            twitter_page_url: string;
            youtube_channel_url: string;
            number_of_employees: number;
            certifications: string[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verified: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    deletePage(id: number, userId: number): Promise<{
        message: string;
    }>;
    removeMember(pageId: number, memberId: number, requesterId: number): Promise<{
        message: string;
    }>;
    changeMemberRole(pageId: number, targetUserId: number, newRole: 'admin' | 'editor', requesterId: number): Promise<{
        message: string;
        data: {
            pageId: number;
            userId: number;
            role: "admin" | "editor";
        };
    }>;
    createEmployerCompany(userId: number, data: any, logoFile?: Express.Multer.File, verificationFile?: Express.Multer.File, idempotencyKey?: string): Promise<{
        message: string;
        company: {
            logoUrl: string;
            id: number;
            name: string;
            companyName: string;
            username: string;
            businessName: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            country: string;
            state: string;
            city: string;
            address_line1: string;
            address_line2: string;
            socials: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    searchEmployerCompanies(userId: number, query: {
        q: string;
        page: number;
        limit: number;
    }): Promise<{
        data: {
            id: number;
            companyName: string;
            username: string;
            industry: string;
            location: string;
            logoUrl: string;
            verified: boolean;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    requestCompanyAccess(companyId: number, userId: number, data: {
        message?: string;
        requestedRole?: 'admin' | 'editor';
        clientRequestId?: string;
    }): Promise<{
        request: {
            id: number;
            companyId: number;
            userId: number;
            user: {
                id: number;
                name: string;
                avatarUrl: string;
            };
            requestedRole: "admin" | "editor";
            message: string;
            status: "pending" | "approved" | "rejected" | "cancelled";
            reviewReason: string;
            reviewedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getCompanyAccessRequests(companyId: number, userId: number, query: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            companyId: number;
            userId: number;
            user: {
                id: number;
                name: string;
                avatarUrl: string;
            };
            requestedRole: "admin" | "editor";
            message: string;
            status: "pending" | "approved" | "rejected" | "cancelled";
            reviewReason: string;
            reviewedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    reviewCompanyAccessRequest(requestId: number, reviewerId: number, data: {
        action: 'approve' | 'reject';
        role?: 'admin' | 'editor';
        permissions?: Partial<CompanyPermissions>;
        reason?: string;
    }): Promise<{
        message: string;
        request: {
            id: number;
            companyId: number;
            userId: number;
            user: {
                id: number;
                name: string;
                avatarUrl: string;
            };
            requestedRole: "admin" | "editor";
            message: string;
            status: "pending" | "approved" | "rejected" | "cancelled";
            reviewReason: string;
            reviewedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    resubmitCompanyVerification(companyId: number, userId: number, data: {
        verificationProofType: string;
        message?: string;
    }, verificationFile?: Express.Multer.File): Promise<{
        message: string;
        company: {
            logoUrl: string;
            id: number;
            name: string;
            companyName: string;
            username: string;
            businessName: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            country: string;
            state: string;
            city: string;
            address_line1: string;
            address_line2: string;
            socials: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    transferCompanyOwnership(companyId: number, ownerId: number, newOwnerUserId: number, currentPassword: string): Promise<{
        message: string;
        companyId: number;
        previousOwnerUserId: number;
        ownerUserId: number;
    }>;
    getAdminCompanyReviews(query: {
        status?: string;
        q?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            id: number;
            companyName: string;
            username: string;
            industry: string;
            location: string;
            logoUrl: string;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verificationProofType: string;
            verificationDocumentUrl: string;
            owner: {
                id: number;
                name: string;
                phone: string;
            };
            verifiedAt: Date;
            verifiedByAdminId: number;
            createdAt: Date;
            updatedAt: Date;
        } | {
            businessName: string;
            description: string;
            officialEmail: string;
            officialPhone: string;
            website: string;
            address: {
                line1: string;
                line2: string;
                city: string;
                state: string;
                country: string;
                postalCode: string;
            };
            registration: {
                number: string;
                taxId: string;
                authority: string;
            };
            representative: {
                name: string;
                designation: string;
                email: string;
                phone: string;
            };
            team: {
                id: number;
                companyId: number;
                userId: number;
                name: string;
                phone: string;
                avatarUrl: string;
                roleType: import("./company-permissions").CompanyMemberRole;
                roleLabel: string;
                hasAccess: boolean;
                permissions: CompanyPermissions;
            }[];
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            id: number;
            companyName: string;
            username: string;
            industry: string;
            location: string;
            logoUrl: string;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verificationProofType: string;
            verificationDocumentUrl: string;
            owner: {
                id: number;
                name: string;
                phone: string;
            };
            verifiedAt: Date;
            verifiedByAdminId: number;
            createdAt: Date;
            updatedAt: Date;
        })[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getAdminCompanyReview(companyId: number): Promise<{
        company: {
            id: number;
            companyName: string;
            username: string;
            industry: string;
            location: string;
            logoUrl: string;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verificationProofType: string;
            verificationDocumentUrl: string;
            owner: {
                id: number;
                name: string;
                phone: string;
            };
            verifiedAt: Date;
            verifiedByAdminId: number;
            createdAt: Date;
            updatedAt: Date;
        } | {
            businessName: string;
            description: string;
            officialEmail: string;
            officialPhone: string;
            website: string;
            address: {
                line1: string;
                line2: string;
                city: string;
                state: string;
                country: string;
                postalCode: string;
            };
            registration: {
                number: string;
                taxId: string;
                authority: string;
            };
            representative: {
                name: string;
                designation: string;
                email: string;
                phone: string;
            };
            team: {
                id: number;
                companyId: number;
                userId: number;
                name: string;
                phone: string;
                avatarUrl: string;
                roleType: import("./company-permissions").CompanyMemberRole;
                roleLabel: string;
                hasAccess: boolean;
                permissions: CompanyPermissions;
            }[];
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            id: number;
            companyName: string;
            username: string;
            industry: string;
            location: string;
            logoUrl: string;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verificationProofType: string;
            verificationDocumentUrl: string;
            owner: {
                id: number;
                name: string;
                phone: string;
            };
            verifiedAt: Date;
            verifiedByAdminId: number;
            createdAt: Date;
            updatedAt: Date;
        };
        verificationHistory: CompanyVerificationReview[];
    }>;
    getEmployerAccounts(userId: number): Promise<{
        data: {
            id: string;
            companyId: any;
            companyName: string;
            roleType: string;
            branchId: any;
            branchLocation: any;
            logoUrl: any;
            postingMode: string;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
                publishContent: boolean;
            };
            verificationStatus: any;
            verificationReason: any;
            canPublish: boolean;
            canPostJobs: boolean;
            jobPostingDisabledReason: any;
        }[];
    }>;
    getEmployerCompanySelectOptions(userId: number): Promise<{
        data: {
            id: any;
            label: string;
            logoUrl: any;
            postingMode: string;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
                publishContent: boolean;
            };
            verificationStatus: any;
            verificationReason: any;
            canPublish: boolean;
            canPostJobs: boolean;
            jobPostingDisabledReason: any;
        }[];
    }>;
    getEmployerCompany(companyId: number, userId: number): Promise<{
        data: {
            myRole: import("./company-permissions").CompanyMemberRole;
            myPermissions: CompanyPermissions;
            canPublish: boolean;
            canPostJobs: boolean;
            jobPostingDisabledReason: string;
            logoUrl: string;
            id: number;
            name: string;
            companyName: string;
            username: string;
            businessName: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            country: string;
            state: string;
            city: string;
            address_line1: string;
            address_line2: string;
            socials: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    updateEmployerCompany(companyId: number, userId: number, data: any): Promise<{
        message: string;
        data: {
            logoUrl: string;
            id: number;
            name: string;
            companyName: string;
            username: string;
            businessName: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            country: string;
            state: string;
            city: string;
            address_line1: string;
            address_line2: string;
            socials: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    uploadEmployerCompanyLogo(companyId: number, userId: number, file?: Express.Multer.File): Promise<{
        message: string;
        data: {
            logoUrl: string;
            id: number;
            name: string;
            companyName: string;
            username: string;
            businessName: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
            foundedYear: number;
            employeeCount: number;
            companyType: string;
            certifications: string[];
            country: string;
            state: string;
            city: string;
            address_line1: string;
            address_line2: string;
            socials: {
                linkedin: string;
                facebook: string;
                instagram: string;
                twitter: string;
                youtube: string;
            };
            branches: {
                id: number;
                label: string;
                address: string;
                lat: number;
                lng: number;
                location: {
                    lat: number;
                    lng: number;
                };
            }[];
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    createBranch(companyId: number, userId: number, data: any): Promise<{
        message: string;
        data: {
            id: number;
            label: string;
            address: string;
            lat: number;
            lng: number;
            location: {
                lat: number;
                lng: number;
            };
        };
    }>;
    updateBranch(companyId: number, branchId: number, userId: number, data: any): Promise<{
        message: string;
        data: {
            id: number;
            label: string;
            address: string;
            lat: number;
            lng: number;
            location: {
                lat: number;
                lng: number;
            };
        };
    }>;
    deleteBranch(companyId: number, branchId: number, userId: number): Promise<{
        message: string;
    }>;
    getCompanyTeam(companyId: number, userId: number): Promise<{
        data: {
            id: number;
            companyId: number;
            userId: number;
            name: string;
            phone: string;
            avatarUrl: string;
            roleType: import("./company-permissions").CompanyMemberRole;
            roleLabel: string;
            hasAccess: boolean;
            permissions: CompanyPermissions;
        }[];
    }>;
    inviteOrGrantCompanyTeamMember(companyId: number, userId: number, data: any): Promise<{
        message: string;
        data: {
            id: number;
            companyId: number;
            userId: number;
            name: string;
            phone: string;
            avatarUrl: string;
            roleType: import("./company-permissions").CompanyMemberRole;
            roleLabel: string;
            hasAccess: boolean;
            permissions: CompanyPermissions;
        };
    }>;
    updateCompanyTeamAccess(memberId: number, userId: number, hasAccess: boolean): Promise<{
        message: string;
        data: {
            id: number;
            companyId: number;
            userId: number;
            name: string;
            phone: string;
            avatarUrl: string;
            roleType: import("./company-permissions").CompanyMemberRole;
            roleLabel: string;
            hasAccess: boolean;
            permissions: CompanyPermissions;
        };
    }>;
    updateCompanyTeamPermissions(memberId: number, userId: number, permissions: Partial<CompanyPermissions>): Promise<{
        message: string;
        data: {
            id: number;
            companyId: number;
            userId: number;
            name: string;
            phone: string;
            avatarUrl: string;
            roleType: import("./company-permissions").CompanyMemberRole;
            roleLabel: string;
            hasAccess: boolean;
            permissions: CompanyPermissions;
        };
    }>;
    userHasCompanyPermission(companyId: number, userId: number, permission: CompanyPermissionKey): Promise<boolean>;
    getReelPublisherOptions(userId: number): Promise<{
        data: ({
            disabledReason?: string;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        } | {
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        })[];
    }>;
    getPublisherOptions(userId: number, capability?: 'publishContent'): Promise<{
        data: ({
            disabledReason?: string;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        } | {
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
            canPublish: boolean;
        })[];
    }>;
    getManageablePublishingCompanyIds(userId: number, companyIds: number[]): Promise<number[]>;
    updateCompanyVerification(companyId: number, adminId: number, status: CompanyPage['verificationStatus'], reason?: string): Promise<{
        message: string;
        company: {
            id: number;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            verifiedByAdminId: number;
        };
    }>;
    private generateUsername;
    private companyLogoUrl;
    private formatCompanyWithAssets;
    private formatAccessRequest;
    private formatAdminCompany;
    private mapEmployerCompanyPatch;
    private mapCompanyPatch;
}
