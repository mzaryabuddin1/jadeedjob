import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from './company-page.entity';
import { CompanyMemberRole, CompanyPermissions } from '../company-permissions';
export declare class PageMember {
    id: number;
    pageId: number;
    page: CompanyPage;
    userId: number;
    user: User;
    role: CompanyMemberRole;
    hasAccess: boolean;
    permissions: Partial<CompanyPermissions>;
    createdAt: Date;
}
