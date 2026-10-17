import { Repository } from 'typeorm';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
export declare const PAGE_MANAGER_ROLES: string[];
export declare function isJobEmployer(pageRepo: Repository<CompanyPage>, job: {
    createdBy: number;
    pageId?: number | null;
}, userId: number): Promise<boolean>;
