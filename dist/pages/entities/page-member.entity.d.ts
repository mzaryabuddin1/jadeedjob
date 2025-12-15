import { User } from "src/users/entities/user.entity";
import { CompanyPage } from "./company-page.entity";
export declare class PageMember {
    id: number;
    pageId: number;
    page: CompanyPage;
    userId: number;
    user: User;
    role: 'owner' | 'admin' | 'editor';
    createdAt: Date;
}
