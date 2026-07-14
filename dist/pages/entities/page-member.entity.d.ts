import { User } from "src/users/entities/user.entity";
import { CompanyPage } from "./company-page.entity";
export declare class PageMember {
    id: number;
    pageId: number;
    page: CompanyPage;
    userId: number;
    user: User;
    role: 'owner' | 'admin' | 'editor';
    hasAccess: boolean;
    permissions: {
        postJobs?: boolean;
        editJobs?: boolean;
        viewApplicants?: boolean;
        chatApplicants?: boolean;
        manageTeam?: boolean;
    };
    createdAt: Date;
}
