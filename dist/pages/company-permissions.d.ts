export type CompanyMemberRole = 'owner' | 'admin' | 'editor';
export type CompanyPermissionKey = 'postJobs' | 'editJobs' | 'viewApplicants' | 'chatApplicants' | 'manageTeam' | 'publishContent';
export type CompanyPermissions = Record<CompanyPermissionKey, boolean>;
export declare const COMPANY_PERMISSION_KEYS: CompanyPermissionKey[];
export declare const FULL_COMPANY_PERMISSIONS: CompanyPermissions;
export declare function getDefaultCompanyPermissions(role: CompanyMemberRole): CompanyPermissions;
export declare function normalizeCompanyPermissions(role: CompanyMemberRole, permissions?: Partial<CompanyPermissions> | null): CompanyPermissions;
