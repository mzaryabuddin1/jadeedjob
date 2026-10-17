"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PAGE_PERMISSIONS = exports.ASSIGNABLE_ROLES = exports.PAGE_ROLES = void 0;
exports.roleHasPermission = roleHasPermission;
exports.rolesWith = rolesWith;
exports.PAGE_ROLES = ['owner', 'admin', 'editor'];
exports.ASSIGNABLE_ROLES = ['admin', 'editor'];
exports.PAGE_PERMISSIONS = [
    'page.edit',
    'page.delete',
    'members.view',
    'members.invite',
    'members.remove',
    'members.change_role',
    'jobs.manage',
    'applications.manage',
    'ratings.give',
    'verification.submit',
    'verification.view',
];
exports.ROLE_PERMISSIONS = {
    owner: exports.PAGE_PERMISSIONS,
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
function roleHasPermission(role, permission) {
    return (!!role && (exports.ROLE_PERMISSIONS[role] ?? []).includes(permission));
}
function rolesWith(permission) {
    return exports.PAGE_ROLES.filter((r) => exports.ROLE_PERMISSIONS[r].includes(permission));
}
//# sourceMappingURL=page-permissions.js.map