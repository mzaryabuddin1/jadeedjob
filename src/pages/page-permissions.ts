/**
 * Page roles and what each role may do. This is the ONLY place that decides
 * page access - controllers/services ask `roleHasPermission(role, permission)`.
 *
 * Extra rules that a flat list cannot express (enforced in PagesService):
 * - only the owner can invite/promote someone to `admin` or change roles;
 *   an admin can invite and remove `editor`s only
 * - the owner can never be removed, demoted or leave (delete the page instead)
 */
export const PAGE_ROLES = ['owner', 'admin', 'editor'] as const;
export type PageRole = (typeof PAGE_ROLES)[number];

/** Roles that can be handed out (the owner role is not transferable here) */
export const ASSIGNABLE_ROLES: PageRole[] = ['admin', 'editor'];

export const PAGE_PERMISSIONS = [
  'page.edit', // edit profile fields, logo, contact, social links
  'page.delete',
  'members.view',
  'members.invite', // send / cancel invitations
  'members.remove',
  'members.change_role',
  'jobs.manage', // post / edit jobs under the page
  'applications.manage', // view applicants, accept / reject
  'ratings.give', // rate applicants on behalf of the page
  'verification.submit', // send documents to get the verified tick
  'verification.view',
] as const;
export type PagePermission = (typeof PAGE_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<PageRole, readonly PagePermission[]> = {
  owner: PAGE_PERMISSIONS,
  admin: [
    'page.edit',
    'members.view',
    'members.invite',
    'members.remove',
    'jobs.manage',
    'applications.manage',
    'ratings.give',
    'verification.submit',
    'verification.view',
  ],
  editor: [
    'members.view',
    'jobs.manage',
    'applications.manage',
    'ratings.give',
  ],
};

export function roleHasPermission(
  role: string | null | undefined,
  permission: PagePermission,
): boolean {
  return (
    !!role && (ROLE_PERMISSIONS[role as PageRole] ?? []).includes(permission)
  );
}

export function rolesWith(permission: PagePermission): PageRole[] {
  return PAGE_ROLES.filter((r) => ROLE_PERMISSIONS[r].includes(permission));
}
