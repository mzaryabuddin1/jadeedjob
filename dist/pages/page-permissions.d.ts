export declare const PAGE_ROLES: readonly ["owner", "admin", "editor"];
export type PageRole = (typeof PAGE_ROLES)[number];
export declare const ASSIGNABLE_ROLES: PageRole[];
export declare const PAGE_PERMISSIONS: readonly ["page.edit", "page.delete", "members.view", "members.invite", "members.remove", "members.change_role", "jobs.manage", "applications.manage", "ratings.give", "posts.manage", "analytics.view", "verification.submit", "verification.view"];
export type PagePermission = (typeof PAGE_PERMISSIONS)[number];
export declare const ROLE_PERMISSIONS: Record<PageRole, readonly PagePermission[]>;
export declare function roleHasPermission(role: string | null | undefined, permission: PagePermission): boolean;
export declare function rolesWith(permission: PagePermission): PageRole[];
