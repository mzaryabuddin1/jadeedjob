"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FULL_COMPANY_PERMISSIONS = exports.COMPANY_PERMISSION_KEYS = void 0;
exports.getDefaultCompanyPermissions = getDefaultCompanyPermissions;
exports.normalizeCompanyPermissions = normalizeCompanyPermissions;
exports.COMPANY_PERMISSION_KEYS = [
    'postJobs',
    'editJobs',
    'viewApplicants',
    'chatApplicants',
    'manageTeam',
    'publishContent',
];
exports.FULL_COMPANY_PERMISSIONS = {
    postJobs: true,
    editJobs: true,
    viewApplicants: true,
    chatApplicants: true,
    manageTeam: true,
    publishContent: true,
};
function getDefaultCompanyPermissions(role) {
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
    return { ...exports.FULL_COMPANY_PERMISSIONS };
}
function normalizeCompanyPermissions(role, permissions) {
    if (role === 'owner') {
        return { ...exports.FULL_COMPANY_PERMISSIONS };
    }
    const normalized = getDefaultCompanyPermissions(role);
    for (const key of exports.COMPANY_PERMISSION_KEYS) {
        if (typeof permissions?.[key] === 'boolean') {
            normalized[key] = permissions[key];
        }
    }
    return normalized;
}
//# sourceMappingURL=company-permissions.js.map