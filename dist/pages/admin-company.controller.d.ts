import { PagesService } from './pages.service';
export declare class AdminCompanyController {
    private readonly pagesService;
    constructor(pagesService: PagesService);
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
