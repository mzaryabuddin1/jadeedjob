import { Page } from './entities/page.entity';
import {
  PAGE_PERMISSIONS,
  PagePermission,
  PageRole,
  roleHasPermission,
} from './page-permissions';

/** Safe for everybody who can open the page */
const PUBLIC_FIELDS = [
  'id',
  'page_name',
  'business_name',
  'username',
  'page_logo',
  'website_url',
  'official_email',
  'official_phone',
  'industry_type',
  'page_description',
  'founded_year',
  'country',
  'state',
  'city',
  'postal_code',
  'address_line1',
  'address_line2',
  'google_maps_link',
  'page_type',
  'linkedin_page_url',
  'facebook_page_url',
  'instagram_page_url',
  'twitter_page_url',
  'youtube_channel_url',
  'number_of_employees',
  'client_list',
  'certifications',
  'page_rating',
  'page_rating_count',
  'is_verified',
  'verified_at',
  'createdAt',
] as const;

/** Business / identity details - only people who can edit the page see them */
const PRIVATE_FIELDS = [
  'ownerId',
  'business_registration_number',
  'tax_identification_number',
  'registration_authority',
  'business_license_document',
  'representative_name',
  'representative_designation',
  'representative_email',
  'representative_phone',
  'id_proof_document',
  'verified_email_domain',
  'annual_revenue_range',
  'verification_status',
] as const;

/**
 * What a viewer gets to see of a page:
 * - everybody: public profile (+ the verified tick)
 * - members with `page.edit` (owner, admin): also the private business details
 * Also tells the viewer their own role and permissions.
 */
export function toPageView(page: Page, role: PageRole | null) {
  const view: Record<string, any> = {};
  for (const f of PUBLIC_FIELDS) view[f] = (page as any)[f];

  if (roleHasPermission(role, 'page.edit')) {
    for (const f of PRIVATE_FIELDS) view[f] = (page as any)[f];
  }

  view.myRole = role;
  view.association = role ?? 'public'; // kept for older app builds
  view.permissions = role ? permissionsOf(role) : [];
  return view;
}

export function permissionsOf(role: PageRole): PagePermission[] {
  return PAGE_PERMISSIONS.filter((p) => roleHasPermission(role, p));
}

/** Profile fields a user may set when creating / editing a page */
export const EDITABLE_PAGE_FIELDS = [
  'page_name',
  'business_name',
  'page_logo',
  'website_url',
  'official_email',
  'official_phone',
  'industry_type',
  'page_description',
  'founded_year',
  'country',
  'state',
  'city',
  'postal_code',
  'address_line1',
  'address_line2',
  'google_maps_link',
  'business_registration_number',
  'tax_identification_number',
  'registration_authority',
  'business_license_document',
  'page_type',
  'representative_name',
  'representative_designation',
  'representative_email',
  'representative_phone',
  'id_proof_document',
  'linkedin_page_url',
  'facebook_page_url',
  'instagram_page_url',
  'twitter_page_url',
  'youtube_channel_url',
  'verified_email_domain',
  'number_of_employees',
  'annual_revenue_range',
  'client_list',
  'certifications',
] as const;
