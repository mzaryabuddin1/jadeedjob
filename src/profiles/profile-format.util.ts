import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { User } from 'src/users/entities/user.entity';

export function getUserDisplayName(user?: User) {
  return (
    user?.full_name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    'Jadeed user'
  );
}

export function buildUserHandle(user?: User) {
  const name = getUserDisplayName(user);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);

  return `@${slug || 'user'}_${user?.id || 'unknown'}`;
}

export function buildCompanyHandle(company?: CompanyPage) {
  return `@${company?.username || `company_${company?.id || 'unknown'}`}`;
}

export function formatUserPublisher(user?: User) {
  return {
    type: 'user' as const,
    id: user?.id ? String(user.id) : undefined,
    name: getUserDisplayName(user),
    handle: buildUserHandle(user),
    avatarUri: user?.profile_photo || null,
    verified: Boolean(user?.isVerified),
  };
}

export function formatCompanyPublisher(company?: CompanyPage) {
  return {
    type: 'company' as const,
    id: company?.id ? String(company.id) : undefined,
    name: company?.company_name || 'Company',
    handle: buildCompanyHandle(company),
    avatarUri: company?.company_logo || null,
    verified: company?.verificationStatus === 'approved',
  };
}
