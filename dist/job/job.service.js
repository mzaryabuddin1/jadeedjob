"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("./entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const company_branch_entity_1 = require("../pages/entities/company-branch.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const company_permissions_1 = require("../pages/company-permissions");
const moderation_service_1 = require("../moderation/moderation.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const JOB_SORT_COLUMNS = {
    createdAt: 'job.createdAt',
    updatedAt: 'job.updatedAt',
    salaryAmount: 'job.salaryAmount',
    title: 'job.title',
    status: 'job.status',
};
let JobService = class JobService {
    constructor(jobRepo, userRepo, pageRepo, branchRepo, memberRepo, jobApplicationRepo, firebaseService, notificationsService, moderationService, idempotencyService) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.branchRepo = branchRepo;
        this.memberRepo = memberRepo;
        this.jobApplicationRepo = jobApplicationRepo;
        this.firebaseService = firebaseService;
        this.notificationsService = notificationsService;
        this.moderationService = moderationService;
        this.idempotencyService = idempotencyService;
    }
    async assertCompanyPermission(pageId, userId, permission, requireApproval = false) {
        if (!pageId)
            return;
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Company not found');
        if (requireApproval && page.verificationStatus !== 'approved') {
            throw new common_1.ForbiddenException(`Company job posting is unavailable while verification is ${page.verificationStatus || 'pending'}`);
        }
        if (page.ownerId === userId)
            return;
        const member = page.members?.find((item) => item.userId === userId);
        if (!member || member.hasAccess === false) {
            throw new common_1.ForbiddenException('You do not have access to this company');
        }
        const permissions = (0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions);
        if (!permissions[permission]) {
            throw new common_1.ForbiddenException('You do not have permission for this action');
        }
    }
    async normalizeCompanyAndBranch(data, userId) {
        let pageId = this.optionalPositiveId(data.companyId ?? data.pageId);
        let branchId = this.optionalPositiveId(data.branchId);
        if (data.postingMode === 'individual' ||
            data.companyId === null ||
            data.pageId === null) {
            pageId = null;
            branchId = null;
        }
        if (branchId) {
            const branch = await this.branchRepo.findOne({ where: { id: branchId } });
            if (!branch)
                throw new common_1.BadRequestException('Branch not found');
            if (pageId && branch.companyId !== pageId) {
                throw new common_1.BadRequestException('Branch does not belong to company');
            }
            pageId = branch.companyId;
        }
        if (data.postingMode === 'company' && !pageId) {
            throw new common_1.BadRequestException('companyId is required for company posting');
        }
        await this.assertCompanyPermission(pageId, userId, 'postJobs', true);
        return { pageId: pageId ?? null, branchId: branchId ?? null };
    }
    async assertJobUpdateAccess(job, nextPageId, userId) {
        const currentPageId = job.pageId ?? null;
        if (currentPageId === nextPageId) {
            if (nextPageId) {
                await this.assertCompanyPermission(nextPageId, userId, 'editJobs', true);
            }
            else if (job.createdBy !== userId) {
                throw new common_1.ForbiddenException('You are not allowed to update this job');
            }
            return;
        }
        if (currentPageId) {
            await this.assertCompanyPermission(currentPageId, userId, 'editJobs');
        }
        else if (job.createdBy !== userId) {
            throw new common_1.ForbiddenException('You are not allowed to update this job');
        }
        if (nextPageId) {
            await this.assertCompanyPermission(nextPageId, userId, 'postJobs', true);
        }
        else if (job.createdBy !== userId) {
            throw new common_1.ForbiddenException('Only the job creator can move it to an individual account');
        }
    }
    optionalPositiveId(value) {
        if (value === undefined || value === null || value === '')
            return undefined;
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) {
            throw new common_1.BadRequestException('Invalid ID value');
        }
        return id;
    }
    parseJobStatuses(value) {
        if (value === undefined || value === null || value === '')
            return [];
        const values = Array.isArray(value) ? value : String(value).split(',');
        const statuses = [
            ...new Set(values
                .map((item) => String(item).trim().toLowerCase())
                .filter(Boolean)),
        ];
        if (statuses.some((item) => !['draft', 'active', 'closed'].includes(item))) {
            throw new common_1.BadRequestException('Invalid job status filter');
        }
        return statuses;
    }
    normalizeJobPayload(data, pageId, branchId) {
        const status = (data.status || 'active');
        if (!['draft', 'active', 'closed'].includes(status)) {
            throw new common_1.BadRequestException('Invalid job status');
        }
        const payload = { ...data };
        delete payload.companyId;
        delete payload.location;
        if (payload.jobType && !payload.jobTypes)
            payload.jobTypes = [payload.jobType];
        if (payload.shift && !payload.shifts)
            payload.shifts = [payload.shift];
        if (payload.deadline && !payload.endDate)
            payload.endDate = payload.deadline;
        payload.pageId = pageId;
        payload.branchId = branchId;
        payload.postingMode = pageId ? 'company' : 'individual';
        payload.status = status;
        payload.isActive = status === 'active';
        payload.isRemote = Boolean(payload.isRemote);
        return payload;
    }
    buildLocationUpdate(data, status) {
        if (data.isRemote === true)
            return null;
        if (!data.location && status === 'draft')
            return null;
        if (!data.location)
            return undefined;
        if (typeof data.location?.lat !== 'number' ||
            typeof data.location?.lng !== 'number') {
            throw new common_1.BadRequestException('Valid location is required');
        }
        return () => `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;
    }
    async createJob(data, userId, idempotencyKey) {
        return this.idempotencyService.execute(userId, 'job:create', idempotencyKey, data, () => this.createJobInternal(data, userId));
    }
    async createJobInternal(data, userId) {
        const { pageId, branchId } = await this.normalizeCompanyAndBranch(data, userId);
        const payload = this.normalizeJobPayload(data, pageId, branchId);
        const status = payload.status;
        const location = this.buildLocationUpdate(data, status);
        if (location === undefined && payload.isRemote !== true && status !== 'draft') {
            throw new common_1.BadRequestException('Valid location is required');
        }
        const insertResult = await this.jobRepo.insert({
            ...payload,
            createdBy: userId,
            location,
        });
        const insertedId = insertResult.identifiers?.[0]?.id;
        if (!insertedId)
            throw new common_1.BadRequestException('Failed to create job');
        const savedJob = await this.findJobEntityForResponse(insertedId);
        if (!savedJob)
            throw new common_1.BadRequestException('Failed to load created job');
        if (savedJob.filterId && savedJob.status === 'active') {
            await this.firebaseService.sendToFilterTopic(savedJob.filterId, 'New Job Posted', savedJob.title ?? 'A new job matches your preferences!', {
                jobId: savedJob.id.toString(),
                filterId: savedJob.filterId.toString(),
            });
            await this.notificationsService.createForFilterSubscribers(savedJob.filterId, 'New Job Posted', savedJob.title ?? 'A new job matches your preferences!', {
                jobId: String(savedJob.id),
                filterId: String(savedJob.filterId),
                companyId: savedJob.pageId ? String(savedJob.pageId) : null,
            }, userId);
        }
        return this.formatJob(savedJob);
    }
    async findNearbyJobs(query, userId) {
        const { lat, lng, page = 1, limit = 10, search = '', sortBy, sortOrder = 'DESC', } = query;
        const currentPage = Number(page);
        const take = Math.min(100, Math.max(1, Number(limit) || 10));
        const latitude = Number(lat);
        const longitude = Number(lng);
        const offset = (currentPage - 1) * take;
        if (!Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(currentPage) ||
            currentPage < 1) {
            throw new common_1.BadRequestException('Invalid nearby job query parameters');
        }
        const allowedSortColumns = {
            createdAt: 'j.createdAt',
            updatedAt: 'j.updatedAt',
            salaryAmount: 'j.salaryAmount',
            title: 'j.title',
            distance: 'distance',
        };
        const hasExplicitSortBy = sortBy !== undefined && sortBy !== '';
        const requestedSortBy = hasExplicitSortBy ? String(sortBy) : 'distance';
        const orderBy = allowedSortColumns[requestedSortBy] ?? 'distance';
        const orderDirection = hasExplicitSortBy
            ? String(sortOrder).toUpperCase() === 'ASC'
                ? 'ASC'
                : 'DESC'
            : 'ASC';
        const pointText = `POINT(${longitude} ${latitude})`;
        const searchClause = search
            ? 'AND (j.title LIKE ? OR j.description LIKE ? OR p.company_name LIKE ?)'
            : '';
        const searchParams = search
            ? [`%${search}%`, `%${search}%`, `%${search}%`]
            : [];
        const blocked = userId
            ? await this.moderationService.blockedTargets(userId)
            : { userIds: [], companyIds: [] };
        const blockedUserClause = blocked.userIds.length
            ? 'AND (j.pageId IS NOT NULL OR j.createdBy NOT IN (?))'
            : '';
        const blockedCompanyClause = blocked.companyIds.length
            ? 'AND (j.pageId IS NULL OR j.pageId NOT IN (?))'
            : '';
        const visibilityParams = [
            ...(blocked.userIds.length ? [blocked.userIds] : []),
            ...(blocked.companyIds.length ? [blocked.companyIds] : []),
        ];
        const jobs = await this.jobRepo.query(`
        SELECT
          j.*,
          CASE WHEN j.location IS NULL THEN NULL ELSE ST_X(j.location) END AS lng,
          CASE WHEN j.location IS NULL THEN NULL ELSE ST_Y(j.location) END AS lat,
          p.id AS page_id,
          p.company_name,
          p.username AS page_username,
          p.company_logo,
          b.id AS branch_id,
          b.label AS branch_label,
          b.address AS branch_address,
          b.lat AS branch_lat,
          b.lng AS branch_lng,
          u.firstName AS creator_firstName,
          u.lastName AS creator_lastName,
          u.full_name AS creator_full_name,
          u.profile_photo AS creator_profile_photo,
          (SELECT COUNT(*) FROM job_applications ja WHERE ja.jobId = j.id) AS applicationsCount,
          CASE
            WHEN j.location IS NULL THEN NULL
            ELSE ST_Distance_Sphere(j.location, ST_GeomFromText(?, 4326))
          END AS distance
        FROM jobs j
        LEFT JOIN pages p ON p.id = j.pageId
        LEFT JOIN company_branches b ON b.id = j.branchId
        LEFT JOIN users u ON u.id = j.createdBy
        WHERE j.isActive = 1 AND COALESCE(j.status, 'active') = 'active'
          AND COALESCE(j.moderationStatus, 'visible') = 'visible'
          AND u.isBanned = 0 AND u.deletedAt IS NULL
          AND (j.pageId IS NULL OR p.verificationStatus = 'approved')
          ${blockedUserClause}
          ${blockedCompanyClause}
          ${searchClause}
        ORDER BY j.location IS NULL ASC, ${orderBy} ${orderDirection}
        LIMIT ?
        OFFSET ?
      `, [pointText, ...visibilityParams, ...searchParams, take, offset]);
        const countResult = await this.jobRepo.query(`
        SELECT COUNT(*) AS total
        FROM jobs j
        LEFT JOIN pages p ON p.id = j.pageId
        LEFT JOIN users u ON u.id = j.createdBy
        WHERE j.isActive = 1 AND COALESCE(j.status, 'active') = 'active'
          AND COALESCE(j.moderationStatus, 'visible') = 'visible'
          AND u.isBanned = 0 AND u.deletedAt IS NULL
          AND (j.pageId IS NULL OR p.verificationStatus = 'approved')
          ${blockedUserClause}
          ${blockedCompanyClause}
          ${searchClause}
      `, [...visibilityParams, ...searchParams]);
        const total = Number(countResult[0]?.total || 0);
        return {
            data: jobs.map((job) => this.formatRawJob(job)),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async findJobs(query, userId) {
        const { filter, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'DESC', lat, lng, myjobs = false, status, statuses, companyId, } = query;
        const requestedCompanyId = this.optionalPositiveId(companyId);
        const requestedStatuses = this.parseJobStatuses(statuses);
        const requestedStatus = status ? String(status).trim().toLowerCase() : '';
        if (requestedStatus && !['draft', 'active', 'closed'].includes(requestedStatus)) {
            throw new common_1.BadRequestException('Invalid job status filter');
        }
        if (requestedStatus && requestedStatuses.length > 0) {
            throw new common_1.BadRequestException('Use status or statuses, not both');
        }
        if (lat !== undefined &&
            lng !== undefined &&
            lat !== '' &&
            lng !== '' &&
            myjobs !== 'true' &&
            !requestedCompanyId) {
            return this.findNearbyJobs(query, userId);
        }
        if (requestedCompanyId && myjobs === 'true') {
            throw new common_1.BadRequestException('companyId cannot be combined with myjobs');
        }
        if (requestedCompanyId) {
            const company = await this.pageRepo.findOne({
                where: { id: requestedCompanyId },
            });
            if (!company || company.verificationStatus !== 'approved') {
                throw new common_1.NotFoundException('Company profile not found');
            }
        }
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 10));
        const orderColumn = JOB_SORT_COLUMNS[sortBy] || JOB_SORT_COLUMNS.createdAt;
        const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const qb = this.jobRepo
            .createQueryBuilder('job')
            .leftJoinAndSelect('job.page', 'page')
            .leftJoinAndSelect('job.branch', 'branch')
            .leftJoinAndSelect('job.creator', 'creator')
            .leftJoin('page.members', 'member')
            .loadRelationCountAndMap('job.applicationsCount', 'job.applications');
        qb.andWhere("COALESCE(job.moderationStatus, 'visible') = 'visible'");
        if (myjobs === 'true') {
            if (!userId)
                throw new common_1.BadRequestException('User not authenticated');
            qb.andWhere(new typeorm_2.Brackets((inner) => {
                inner
                    .where('job.createdBy = :userId', { userId })
                    .orWhere('page.ownerId = :userId', { userId })
                    .orWhere('member.userId = :userId', { userId });
            }));
        }
        else {
            qb.andWhere('job.isActive = :active', { active: true });
            qb.andWhere("COALESCE(job.status, 'active') = 'active'");
            qb.andWhere('creator.isBanned = :creatorBanned', {
                creatorBanned: false,
            });
            qb.andWhere('creator.deletedAt IS NULL');
            qb.andWhere('(job.pageId IS NULL OR page.verificationStatus = :approvedCompany)', { approvedCompany: 'approved' });
            if (userId) {
                const blocked = await this.moderationService.blockedTargets(userId);
                if (blocked.userIds.length) {
                    qb.andWhere('(job.pageId IS NOT NULL OR job.createdBy NOT IN (:...blockedUserIds))', { blockedUserIds: blocked.userIds });
                }
                if (blocked.companyIds.length) {
                    qb.andWhere('(job.pageId IS NULL OR job.pageId NOT IN (:...blockedCompanyIds))', { blockedCompanyIds: blocked.companyIds });
                }
            }
        }
        if (filter)
            qb.andWhere('job.filterId = :filterId', { filterId: Number(filter) });
        if (requestedCompanyId) {
            qb.andWhere('job.pageId = :companyId', {
                companyId: requestedCompanyId,
            });
        }
        if (requestedStatuses.length > 0) {
            qb.andWhere("COALESCE(job.status, 'active') IN (:...jobStatuses)", { jobStatuses: requestedStatuses });
        }
        else if (requestedStatus) {
            qb.andWhere("COALESCE(job.status, 'active') = :status", { status: requestedStatus });
        }
        if (search) {
            qb.andWhere(new typeorm_2.Brackets((inner) => {
                inner
                    .where('job.title LIKE :search', { search: `%${search}%` })
                    .orWhere('job.description LIKE :search', { search: `%${search}%` })
                    .orWhere('page.company_name LIKE :search', { search: `%${search}%` })
                    .orWhere('page.username LIKE :search', { search: `%${search}%` })
                    .orWhere('creator.full_name LIKE :search', { search: `%${search}%` })
                    .orWhere('creator.firstName LIKE :search', { search: `%${search}%` })
                    .orWhere('creator.lastName LIKE :search', { search: `%${search}%` });
            }));
        }
        qb.orderBy(orderColumn, orderDirection)
            .skip((currentPage - 1) * take)
            .take(take);
        const [jobs, total] = await qb.getManyAndCount();
        const baseResponse = {
            data: jobs.map((job) => this.formatJob(job)),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
        if (myjobs !== 'true')
            return baseResponse;
        const statusCountsQuery = this.jobRepo
            .createQueryBuilder('countJob')
            .leftJoin('countJob.page', 'countPage')
            .leftJoin('countPage.members', 'countMember')
            .leftJoin('countJob.creator', 'countCreator')
            .select("COALESCE(countJob.status, 'active')", 'status')
            .addSelect('COUNT(DISTINCT countJob.id)', 'count')
            .where("COALESCE(countJob.status, 'active') IN (:...countStatuses)", { countStatuses: ['active', 'closed'] })
            .andWhere("COALESCE(countJob.moderationStatus, 'visible') = 'visible'");
        statusCountsQuery.andWhere(new typeorm_2.Brackets((inner) => {
            inner
                .where('countJob.createdBy = :countUserId', { countUserId: userId })
                .orWhere('countPage.ownerId = :countUserId', { countUserId: userId })
                .orWhere('countMember.userId = :countUserId', { countUserId: userId });
        }));
        if (filter) {
            statusCountsQuery.andWhere('countJob.filterId = :countFilterId', {
                countFilterId: Number(filter),
            });
        }
        if (search) {
            statusCountsQuery.andWhere(new typeorm_2.Brackets((inner) => {
                inner
                    .where('countJob.title LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countJob.description LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countPage.company_name LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countPage.username LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countCreator.full_name LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countCreator.firstName LIKE :countSearch', { countSearch: `%${search}%` })
                    .orWhere('countCreator.lastName LIKE :countSearch', { countSearch: `%${search}%` });
            }));
        }
        const rawStatusCounts = await statusCountsQuery
            .groupBy("COALESCE(countJob.status, 'active')")
            .getRawMany();
        const statusCounts = rawStatusCounts.reduce((result, row) => {
            const rowStatus = String(row.status || '').toLowerCase();
            if (rowStatus === 'active' || rowStatus === 'closed') {
                result[rowStatus] = Number(row.count || 0);
            }
            return result;
        }, { active: 0, closed: 0 });
        return {
            ...baseResponse,
            statusCounts: {
                ...statusCounts,
                total: statusCounts.active + statusCounts.closed,
            },
        };
    }
    async findJobById(id, userId) {
        const job = await this.findJobEntityForResponse(id);
        if (!job)
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        if (job.moderationStatus && job.moderationStatus !== 'visible') {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        const status = job.status || (job.isActive ? 'active' : 'closed');
        let canManage = job.createdBy === userId;
        if (job.pageId && userId) {
            try {
                await this.assertCompanyPermission(job.pageId, Number(userId), 'viewApplicants');
                canManage = true;
            }
            catch {
                canManage = false;
            }
        }
        if (!canManage && status !== 'active') {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        if (!canManage) {
            if (job.creator?.isBanned ||
                job.creator?.deletedAt ||
                (job.pageId && job.page?.verificationStatus !== 'approved')) {
                throw new common_1.NotFoundException(`Job with ID ${id} not found`);
            }
            if (userId &&
                (await this.moderationService.isInteractionBlocked(userId, job.pageId ? 'company' : 'user', job.pageId || job.createdBy))) {
                throw new common_1.NotFoundException(`Job with ID ${id} not found`);
            }
        }
        return this.formatJob(job);
    }
    async updateJob(id, data, userId) {
        const job = await this.jobRepo.findOne({
            where: { id },
            relations: ['page', 'branch'],
        });
        if (!job)
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        let pageId = data.companyId !== undefined || data.pageId !== undefined
            ? this.optionalPositiveId(data.companyId ?? data.pageId) ?? null
            : job.pageId ?? null;
        let branchId = data.branchId !== undefined
            ? this.optionalPositiveId(data.branchId) ?? null
            : job.branchId ?? null;
        if (data.postingMode === 'individual' ||
            data.companyId === null ||
            data.pageId === null) {
            pageId = null;
            branchId = null;
        }
        if (branchId) {
            const branch = await this.branchRepo.findOne({ where: { id: branchId } });
            if (!branch)
                throw new common_1.BadRequestException('Branch not found');
            if (pageId && branch.companyId !== pageId) {
                throw new common_1.BadRequestException('Branch does not belong to company');
            }
            pageId = branch.companyId;
        }
        await this.assertJobUpdateAccess(job, pageId, userId);
        const status = (data.status || job.status || 'active');
        const payload = this.normalizeJobPayload({ ...data, status, isRemote: data.isRemote ?? job.isRemote }, pageId, branchId);
        const locationUpdate = this.buildLocationUpdate(data, status);
        delete payload.createdBy;
        const updatePayload = { ...payload };
        if (locationUpdate !== undefined)
            updatePayload.location = locationUpdate;
        if (data.location === undefined)
            delete updatePayload.location;
        await this.jobRepo.update({ id }, updatePayload);
        return this.findJobById(id, userId);
    }
    async updateJobStatus(id, status, userId) {
        if (!['draft', 'active', 'closed'].includes(status)) {
            throw new common_1.BadRequestException('Invalid job status');
        }
        const job = await this.jobRepo.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (job.pageId) {
            await this.assertCompanyPermission(job.pageId, userId, 'editJobs', status !== 'closed');
        }
        else if (job.createdBy !== userId) {
            throw new common_1.ForbiddenException('You are not allowed to update this job');
        }
        await this.jobRepo.update({ id }, {
            status,
            isActive: status === 'active',
        });
        return this.findJobById(id, userId);
    }
    async closeJob(id, userId) {
        return this.updateJobStatus(id, 'closed', userId);
    }
    async findJobEntityForResponse(id) {
        const qb = this.jobRepo
            .createQueryBuilder('job')
            .leftJoinAndSelect('job.page', 'page')
            .leftJoinAndSelect('job.branch', 'branch')
            .leftJoinAndSelect('job.creator', 'creator')
            .loadRelationCountAndMap('job.applicationsCount', 'job.applications')
            .where('job.id = :id', { id });
        return qb.getOne();
    }
    formatJob(job) {
        const creatorName = job.creator?.full_name ||
            [job.creator?.firstName, job.creator?.lastName].filter(Boolean).join(' ');
        const companyName = job.page?.company_name || creatorName || 'Individual';
        const location = this.formatLocation(job.location);
        return {
            ...job,
            status: job.status || (job.isActive ? 'active' : 'closed'),
            applicationsCount: Number(job.applicationsCount || 0),
            companyId: job.pageId || null,
            companyName,
            employerName: companyName,
            employerType: job.pageId ? 'company' : 'individual',
            employer: {
                id: job.pageId || job.createdBy,
                type: job.pageId ? 'company' : 'individual',
                name: companyName,
                logoUrl: job.page?.company_logo || job.creator?.profile_photo || null,
            },
            pageTaggedJob: Boolean(job.pageId),
            page: job.pageId
                ? {
                    id: job.page.id,
                    company_name: job.page.company_name,
                    username: job.page.username,
                    company_logo: job.page.company_logo,
                }
                : null,
            branch: this.formatBranch(job.branch),
            location,
            positions: job.vacancies ?? null,
            payType: job.salaryType,
        };
    }
    formatRawJob(job) {
        const creatorName = job.creator_full_name ||
            [job.creator_firstName, job.creator_lastName].filter(Boolean).join(' ');
        const companyName = job.company_name || creatorName || 'Individual';
        const location = job.lat === null || job.lng === null
            ? null
            : {
                lat: Number(job.lat),
                lng: Number(job.lng),
            };
        return {
            ...job,
            id: Number(job.id),
            filterId: Number(job.filterId),
            salaryAmount: Number(job.salaryAmount),
            applicationsCount: Number(job.applicationsCount || 0),
            distance: job.distance === null ? null : Number(job.distance),
            location,
            status: job.status || (job.isActive ? 'active' : 'closed'),
            companyId: job.page_id || null,
            companyName,
            employerName: companyName,
            employerType: job.page_id ? 'company' : 'individual',
            employer: {
                id: job.page_id || job.createdBy,
                type: job.page_id ? 'company' : 'individual',
                name: companyName,
                logoUrl: job.company_logo || job.creator_profile_photo || null,
            },
            pageTaggedJob: Boolean(job.page_id),
            page: job.page_id
                ? {
                    id: job.page_id,
                    company_name: job.company_name,
                    username: job.page_username,
                    company_logo: job.company_logo,
                }
                : null,
            branch: job.branch_id
                ? {
                    id: job.branch_id,
                    label: job.branch_label,
                    address: job.branch_address,
                    lat: job.branch_lat,
                    lng: job.branch_lng,
                }
                : null,
            positions: job.vacancies ?? null,
            payType: job.salaryType,
        };
    }
    formatLocation(location) {
        if (!location)
            return null;
        if (typeof location.lat === 'number' && typeof location.lng === 'number') {
            return { lat: location.lat, lng: location.lng };
        }
        if (typeof location.y === 'number' && typeof location.x === 'number') {
            return { lat: location.y, lng: location.x };
        }
        return null;
    }
    formatBranch(branch) {
        if (!branch)
            return null;
        return {
            id: branch.id,
            label: branch.label,
            address: branch.address,
            lat: branch.lat,
            lng: branch.lng,
            location: branch.lat === null || branch.lng === null
                ? null
                : {
                    lat: Number(branch.lat),
                    lng: Number(branch.lng),
                },
        };
    }
};
exports.JobService = JobService;
exports.JobService = JobService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(3, (0, typeorm_1.InjectRepository)(company_branch_entity_1.CompanyBranch)),
    __param(4, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(5, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService,
        notifications_service_1.NotificationsService,
        moderation_service_1.ModerationService,
        idempotency_service_1.IdempotencyService])
], JobService);
//# sourceMappingURL=job.service.js.map