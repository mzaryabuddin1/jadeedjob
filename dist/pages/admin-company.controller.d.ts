import { PagesService } from './pages.service';
export declare class AdminCompanyController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
    listCompanies(query: any): Promise<{
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
                permissions: import("./company-permissions").CompanyPermissions;
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
    getCompany(companyId: number): Promise<{
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
                permissions: import("./company-permissions").CompanyPermissions;
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
        verificationHistory: import("./entities/company-verification-review.entity").CompanyVerificationReview[];
    }>;
    updateVerification(companyId: number, body: any, req: any): Promise<{
        message: string;
        company: {
            id: number;
            verificationStatus: import("./entities/company-page.entity").CompanyVerificationStatus;
            verificationReason: string;
            verifiedAt: Date;
            verifiedByAdminId: number;
        };
    }>;
}
