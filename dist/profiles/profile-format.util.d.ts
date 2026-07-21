import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { User } from 'src/users/entities/user.entity';
export declare function getUserDisplayName(user?: User): string;
export declare function buildUserHandle(user?: User): string;
export declare function buildCompanyHandle(company?: CompanyPage): string;
export declare function formatUserPublisher(user?: User): {
    type: "user";
    id: string;
    name: string;
    handle: string;
    avatarUri: string;
    verified: boolean;
};
export declare function formatCompanyPublisher(company?: CompanyPage): {
    type: "company";
    id: string;
    name: string;
    handle: string;
    avatarUri: string;
    verified: boolean;
};
