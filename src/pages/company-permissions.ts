export type CompanyMemberRole = 'owner' | 'admin' | 'editor';

export type CompanyPermissionKey =
  | 'postJobs'
  | 'editJobs'
  | 'viewApplicants'
  | 'chatApplicants'
  | 'manageTeam'
  | 'publishContent';

export type CompanyPermissions = Record<CompanyPermissionKey, boolean>;

export const COMPANY_PERMISSION_KEYS: CompanyPermissionKey[] = [
  'postJobs',
  'editJobs',
  'viewApplicants',
  'chatApplicants',
  'manageTeam',
  'publishContent',
];

export const FULL_COMPANY_PERMISSIONS: CompanyPermissions = {
  postJobs: true,
  editJobs: true,
  viewApplicants: true,
  chatApplicants: true,
  manageTeam: true,
  publishContent: true,
};

export function getDefaultCompanyPermissions(
  role: CompanyMemberRole,
): CompanyPermissions {
  if (role === 'editor') {
    return {
      postJobs: true,
      editJobs: true,
      viewApplicants: true,
      chatApplicants: true,
      manageTeam: false,
      publishContent: false,
    };
  }

  return { ...FULL_COMPANY_PERMISSIONS };
}

export function normalizeCompanyPermissions(
  role: CompanyMemberRole,
  permissions?: Partial<CompanyPermissions> | null,
): CompanyPermissions {
  if (role === 'owner') {
    return { ...FULL_COMPANY_PERMISSIONS };
  }

  const normalized = getDefaultCompanyPermissions(role);
  for (const key of COMPANY_PERMISSION_KEYS) {
    if (typeof permissions?.[key] === 'boolean') {
      normalized[key] = permissions[key];
    }
  }

  return normalized;
}
