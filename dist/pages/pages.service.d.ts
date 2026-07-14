import { Repository } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyBranch } from './entities/company-branch.entity';
type EmployerPermissionKey = 'postJobs' | 'editJobs' | 'viewApplicants' | 'chatApplicants' | 'manageTeam';
export declare class PagesService {
    private readonly pageRepo;
    private readonly memberRepo;
    private readonly userRepo;
    private readonly branchRepo;
    constructor(pageRepo: Repository<CompanyPage>, memberRepo: Repository<PageMember>, userRepo: Repository<User>, branchRepo: Repository<CompanyBranch>);
    getDefaultPermissions(role: 'owner' | 'admin' | 'editor'): {
        postJobs: boolean;
        editJobs: boolean;
        viewApplicants: boolean;
        chatApplicants: boolean;
        manageTeam: boolean;
    };
    normalizePermissions(role: 'owner' | 'admin' | 'editor', permissions?: Partial<Record<EmployerPermissionKey, boolean>> | null): {
        postJobs: boolean;
        editJobs: boolean;
        viewApplicants: boolean;
        chatApplicants: boolean;
        manageTeam: boolean;
    };
    private memberForUser;
    private getPageForEmployerAccess;
    private formatBranch;
    private formatCompany;
    private formatMember;
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: CompanyPage[];
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
            official_email: string;
            official_phone: string;
            industry_type: string;
            company_description: string;
            founded_year: number;
            country: string;
            state: string;
            city: string;
            postal_code: string;
            address_line1: string;
            address_line2: string;
            google_maps_link: string;
            business_registration_number: string;
            tax_identification_number: string;
            registration_authority: string;
            business_license_document: string;
            company_type: string;
            representative_name: string;
            representative_designation: string;
            representative_email: string;
            representative_phone: string;
            id_proof_document: string;
            linkedin_page_url: string;
            facebook_page_url: string;
            instagram_page_url: string;
            twitter_page_url: string;
            youtube_channel_url: string;
            verified_email_domain: string;
            number_of_employees: number;
            annual_revenue_range: string;
            client_list: string[];
            certifications: string[];
            company_rating: number;
            ownerId: number;
            owner: User;
            members: PageMember[];
            branches: CompanyBranch[];
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
    getPageById(id: number): Promise<CompanyPage>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: CompanyPage;
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
            };
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
            };
        }[];
    }>;
    getEmployerCompany(companyId: number, userId: number): Promise<{
        data: {
            myRole: "owner" | "admin" | "editor";
            myPermissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
            };
            id: number;
            name: string;
            companyName: string;
            businessName: string;
            logoUrl: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
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
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    updateEmployerCompany(companyId: number, userId: number, data: any): Promise<{
        message: string;
        data: {
            id: number;
            name: string;
            companyName: string;
            businessName: string;
            logoUrl: string;
            description: string;
            website: string;
            email: string;
            phone: string;
            industry: string;
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
            roleType: "owner" | "admin" | "editor";
            roleLabel: string;
            hasAccess: boolean;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
            };
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
            roleType: "owner" | "admin" | "editor";
            roleLabel: string;
            hasAccess: boolean;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
            };
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
            roleType: "owner" | "admin" | "editor";
            roleLabel: string;
            hasAccess: boolean;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
            };
        };
    }>;
    updateCompanyTeamPermissions(memberId: number, userId: number, permissions: Partial<Record<EmployerPermissionKey, boolean>>): Promise<{
        message: string;
        data: {
            id: number;
            companyId: number;
            userId: number;
            name: string;
            phone: string;
            avatarUrl: string;
            roleType: "owner" | "admin" | "editor";
            roleLabel: string;
            hasAccess: boolean;
            permissions: {
                postJobs: boolean;
                editJobs: boolean;
                viewApplicants: boolean;
                chatApplicants: boolean;
                manageTeam: boolean;
            };
        };
    }>;
    userHasCompanyPermission(companyId: number, userId: number, permission: EmployerPermissionKey): Promise<boolean>;
    private mapEmployerCompanyPatch;
}
export {};
