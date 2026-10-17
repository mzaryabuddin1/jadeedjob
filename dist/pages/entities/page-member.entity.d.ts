import { User } from 'src/users/entities/user.entity';
import { Page } from './page.entity';
export declare class PageMember {
    id: number;
    pageId: number;
    page: Page;
    userId: number;
    user: User;
    role: 'owner' | 'admin' | 'editor';
    createdAt: Date;
}
