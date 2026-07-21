"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDisplayName = getUserDisplayName;
exports.buildUserHandle = buildUserHandle;
exports.buildCompanyHandle = buildCompanyHandle;
exports.formatUserPublisher = formatUserPublisher;
exports.formatCompanyPublisher = formatCompanyPublisher;
function getUserDisplayName(user) {
    return (user?.full_name ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        'Jadeed user');
}
function buildUserHandle(user) {
    const name = getUserDisplayName(user);
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 22);
    return `@${slug || 'user'}_${user?.id || 'unknown'}`;
}
function buildCompanyHandle(company) {
    return `@${company?.username || `company_${company?.id || 'unknown'}`}`;
}
function formatUserPublisher(user) {
    return {
        type: 'user',
        id: user?.id ? String(user.id) : undefined,
        name: getUserDisplayName(user),
        handle: buildUserHandle(user),
        avatarUri: user?.profile_photo || null,
        verified: Boolean(user?.isVerified),
    };
}
function formatCompanyPublisher(company) {
    return {
        type: 'company',
        id: company?.id ? String(company.id) : undefined,
        name: company?.company_name || 'Company',
        handle: buildCompanyHandle(company),
        avatarUri: company?.company_logo || null,
        verified: company?.verificationStatus === 'approved',
    };
}
//# sourceMappingURL=profile-format.util.js.map