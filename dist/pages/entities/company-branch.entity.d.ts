import { CompanyPage } from './company-page.entity';
export declare class CompanyBranch {
    id: number;
    companyId: number;
    company: CompanyPage;
    label: string;
    address: string;
    lat: number;
    lng: number;
    createdAt: Date;
    updatedAt: Date;
}
