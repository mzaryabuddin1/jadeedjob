"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDITABLE_PAGE_FIELDS = void 0;
exports.toPageView = toPageView;
exports.permissionsOf = permissionsOf;
const page_permissions_1 = require("./page-permissions");
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
];
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
];
function toPageView(page, role) {
    const view = {};
    for (const f of PUBLIC_FIELDS)
        view[f] = page[f];
    if ((0, page_permissions_1.roleHasPermission)(role, 'page.edit')) {
        for (const f of PRIVATE_FIELDS)
            view[f] = page[f];
    }
    view.myRole = role;
    view.association = role ?? 'public';
    view.permissions = role ? permissionsOf(role) : [];
    return view;
}
function permissionsOf(role) {
    return page_permissions_1.PAGE_PERMISSIONS.filter((p) => (0, page_permissions_1.roleHasPermission)(role, p));
}
exports.EDITABLE_PAGE_FIELDS = [
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
];
//# sourceMappingURL=page-view.js.map