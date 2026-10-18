import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { PagePermission, PageRole } from './page-permissions';
import { PageVerificationService } from './page-verification.service';
import { FollowService } from 'src/follow/follow.service';
import { Post } from 'src/posts/entities/post.entity';
export declare class PagesService {
    private readonly pageRepo;
    private readonly memberRepo;
    private readonly userRepo;
    private readonly verificationService;
    private readonly followService;
    private readonly postRepo;
    constructor(pageRepo: Repository<Page>, memberRepo: Repository<PageMember>, userRepo: Repository<User>, verificationService: PageVerificationService, followService: FollowService, postRepo: Repository<Post>);
    roleOf(page: Page, userId: number): PageRole | null;
    requirePage(id: number): Promise<Page>;
    requirePermission(pageId: number, userId: number, permission: PagePermission, action?: string): Promise<{
        page: Page;
        role: PageRole;
    }>;
    getRoles(): {
        assignable: ("owner" | "admin" | "editor")[];
        roles: {
            [k: string]: readonly ("page.edit" | "page.delete" | "members.view" | "members.invite" | "members.remove" | "members.change_role" | "jobs.manage" | "applications.manage" | "ratings.give" | "posts.manage" | "analytics.view" | "verification.submit" | "verification.view")[];
        };
        allPermissions: readonly ["page.edit", "page.delete", "members.view", "members.invite", "members.remove", "members.change_role", "jobs.manage", "applications.manage", "ratings.give", "posts.manage", "analytics.view", "verification.submit", "verification.view"];
        rules: string[];
    };
    private uniqueUsername;
    createPage(data: any, userId: number): Promise<{
        message: string;
        data: Record<string, any>;
    }>;
    getPages(query: any, userId: number): Promise<{
        data: {
            isFollowing: boolean;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getPageById(id: number, userId: number): Promise<{
        posts: number;
        reels: number;
        isFollowing: boolean;
    }>;
    updatePage(id: number, data: any, userId: number): Promise<{
        message: string;
        data: {
            posts: number;
            reels: number;
            isFollowing: boolean;
        };
    }>;
    deletePage(id: number, userId: number): Promise<{
        message: string;
    }>;
    listMembers(pageId: number, requesterId: number): Promise<{
        isOwner: boolean;
        name: string;
        username: string;
        profile_photo: string;
        userId: number;
        role: "owner" | "admin" | "editor";
        joinedAt: Date;
    }[]>;
    changeMemberRole(pageId: number, targetUserId: number, newRole: 'admin' | 'editor', requesterId: number): Promise<{
        message: string;
        data: {
            pageId: number;
            userId: number;
            role: "admin" | "editor";
        };
    }>;
    removeMember(pageId: number, targetUserId: number, requesterId: number): Promise<{
        message: string;
    }>;
    leavePage(pageId: number, userId: number): Promise<{
        message: string;
    }>;
}
