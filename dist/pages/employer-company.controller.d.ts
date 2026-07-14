import { PagesService } from './pages.service';
export declare class EmployerCompanyController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    getAccounts(req: any): Promise<{
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
    getCompanySelectOptions(req: any): Promise<{
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
    getCompany(companyId: number, req: any): Promise<{
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
    updateCompany(companyId: number, body: any, req: any): Promise<{
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
    createBranch(companyId: number, body: any, req: any): Promise<{
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
    updateBranch(companyId: number, branchId: number, body: any, req: any): Promise<{
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
    deleteBranch(companyId: number, branchId: number, req: any): Promise<{
        message: string;
    }>;
    getTeam(companyId: number, req: any): Promise<{
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
    inviteOrGrant(companyId: number, body: any, req: any): Promise<{
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
    updateAccess(memberId: number, body: any, req: any): Promise<{
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
    updatePermissions(memberId: number, body: any, req: any): Promise<{
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
}
