"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_TEAM_ROLES = void 0;
exports.jobTeamIds = jobTeamIds;
exports.isJobTeam = isJobTeam;
const page_permissions_1 = require("../pages/page-permissions");
exports.JOB_TEAM_ROLES = (0, page_permissions_1.rolesWith)('jobs.manage');
async function jobTeamIds(pageRepo, job) {
    if (!job.pageId)
        return [job.createdBy];
    const page = await pageRepo.findOne({
        where: { id: job.pageId },
        relations: ['members'],
    });
    if (!page)
        return [job.createdBy];
    const ids = new Set([page.ownerId]);
    for (const m of page.members ?? []) {
        if (exports.JOB_TEAM_ROLES.includes(m.role))
            ids.add(m.userId);
    }
    return [...ids];
}
async function isJobTeam(pageRepo, job, userId) {
    return (await jobTeamIds(pageRepo, job)).includes(userId);
}
//# sourceMappingURL=job-team.util.js.map