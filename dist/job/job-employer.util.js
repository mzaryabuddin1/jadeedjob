"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_MANAGER_ROLES = void 0;
exports.isJobEmployer = isJobEmployer;
const page_permissions_1 = require("../pages/page-permissions");
exports.PAGE_MANAGER_ROLES = (0, page_permissions_1.rolesWith)('jobs.manage');
async function isJobEmployer(pageRepo, job, userId) {
    if (job.createdBy === userId)
        return true;
    if (!job.pageId)
        return false;
    const page = await pageRepo.findOne({
        where: { id: job.pageId },
        relations: ['members'],
    });
    if (!page)
        return false;
    if (page.ownerId === userId)
        return true;
    return (page.members || []).some((m) => m.userId === userId && exports.PAGE_MANAGER_ROLES.includes(m.role));
}
//# sourceMappingURL=job-employer.util.js.map