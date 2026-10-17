import { Repository } from 'typeorm';
import { Page } from 'src/pages/entities/page.entity';
export declare const PAGE_MANAGER_ROLES: string[];
export declare function isJobEmployer(pageRepo: Repository<Page>, job: {
    createdBy: number;
    pageId?: number | null;
}, userId: number): Promise<boolean>;
