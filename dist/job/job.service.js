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
var JobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("./entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_service_1 = require("../notification/notification.service");
const page_entity_1 = require("../pages/entities/page.entity");
const page_permissions_1 = require("../pages/page-permissions");
const filter_entity_1 = require("../filter/entities/filter.entity");
let JobService = JobService_1 = class JobService {
    constructor(jobRepo, userRepo, pageRepo, filterRepo, notificationService) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.filterRepo = filterRepo;
        this.notificationService = notificationService;
    }
    toPointSql(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new common_1.BadRequestException('lat and lng must be valid numbers');
        }
        if (lat < -90 || lat > 90) {
            throw new common_1.BadRequestException(`Invalid latitude ${lat}. Must be between -90 and 90 (Google Maps lat).`);
        }
        if (lng < -180 || lng > 180) {
            throw new common_1.BadRequestException(`Invalid longitude ${lng}. Must be between -180 and 180 (Google Maps lng).`);
        }
        return `ST_GeomFromText('POINT(${lng} ${lat})', 4326, 'axis-order=long-lat')`;
    }
    safeSortColumn(sortBy) {
        return JobService_1.SORTABLE_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    }
    safeSortOrder(sortOrder) {
        return String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    }
    parseFilterQuery(filter) {
        if (filter == null || filter === '')
            return [];
        const parts = Array.isArray(filter) ? filter : String(filter).split(',');
        return [
            ...new Set(parts.map((s) => Number(String(s).trim())).filter((n) => n > 0)),
        ];
    }
    toJobFilter(f) {
        return { id: f.id, name: f.name, icon: (0, filter_entity_1.normalizeFilterIcon)(f.icon) };
    }
    slimPage(page) {
        if (!page)
            return null;
        return {
            id: page.id,
            page_name: page.page_name,
            username: page.username,
            page_logo: page.page_logo,
            is_verified: !!page.is_verified,
        };
    }
    jobCategories(job) {
        const filters = job.filters || [];
        return {
            filters: filters.map((f) => this.toJobFilter(f)),
            filterIds: filters.map((f) => f.id),
        };
    }
    async loadFiltersByJobIds(jobIds) {
        const map = new Map();
        if (!jobIds.length)
            return map;
        const jobs = await this.jobRepo
            .createQueryBuilder('job')
            .select('job.id')
            .leftJoinAndSelect('job.filters', 'filters')
            .whereInIds(jobIds)
            .getMany();
        for (const job of jobs)
            map.set(job.id, job.filters || []);
        return map;
    }
    async resolveJobFilters(data) {
        let ids = [];
        if (Array.isArray(data.filterIds) && data.filterIds.length) {
            ids = [...new Set(data.filterIds.map(Number))].filter((n) => !Number.isNaN(n) && n > 0);
        }
        else if (data.filterId != null) {
            ids = [Number(data.filterId)];
        }
        if (!ids.length) {
            throw new common_1.BadRequestException('Provide filterIds (array) or filterId — at least 1 category required');
        }
        if (ids.length > 10) {
            throw new common_1.BadRequestException('A job can have at most 10 filter categories');
        }
        const filters = await this.filterRepo.find({
            where: {
                id: (0, typeorm_2.In)(ids),
                status: 'active',
                approvalStatus: 'approved',
            },
        });
        if (filters.length !== ids.length) {
            throw new common_1.BadRequestException('One or more filterIds are invalid or not approved');
        }
        const byId = new Map(filters.map((f) => [f.id, f]));
        return ids.map((id) => byId.get(id));
    }
    async createJob(data, userId, opts = {}) {
        const requestedPageId = data.pageId != null
            ? Number(data.pageId)
            : data.companyId != null
                ? Number(data.companyId)
                : null;
        let pageId = null;
        if (requestedPageId) {
            const page = await this.pageRepo.findOne({
                where: { id: requestedPageId },
                relations: ['members'],
            });
            if (!page) {
                throw new common_1.BadRequestException('Page not found');
            }
            const member = page.ownerId === userId
                ? { role: 'owner' }
                : page.members.find((m) => m.userId === userId);
            if (!member || !(0, page_permissions_1.roleHasPermission)(member.role, 'jobs.manage')) {
                throw new common_1.BadRequestException('You are not allowed to create jobs for this page');
            }
            pageId = page.id;
        }
        const isRemote = data.isRemote === true;
        if (!isRemote) {
            if (typeof data.location?.lat !== 'number' ||
                typeof data.location?.lng !== 'number') {
                throw new common_1.BadRequestException('Location (lat/lng) is required for on-site jobs');
            }
        }
        const hasLocation = typeof data.location?.lat === 'number' &&
            typeof data.location?.lng === 'number';
        const filters = await this.resolveJobFilters(data);
        const pictures = Array.isArray(data.pictures) && data.pictures.length
            ? data.pictures.slice(0, 4)
            : null;
        const values = {
            title: data.title,
            description: data.description ?? null,
            createdBy: userId,
            pageId: pageId ?? null,
            isRemote,
            pictures,
            salaryType: data.salaryType,
            salaryAmount: data.salaryAmount,
            currency: data.currency ?? null,
            requirements: data.requirements ?? null,
            benefits: data.benefits ?? null,
            shifts: data.shifts ?? null,
            jobTypes: data.jobTypes ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            industry: data.industry ?? null,
            educationLevel: data.educationLevel ?? null,
            experienceRequired: data.experienceRequired ?? null,
            languageRequirements: data.languageRequirements ?? null,
            isActive: true,
            location: hasLocation
                ? () => this.toPointSql(data.location.lat, data.location.lng)
                : null,
        };
        let insertedId;
        try {
            const insertResult = await this.jobRepo
                .createQueryBuilder()
                .insert()
                .into(job_entity_1.Job)
                .values(values)
                .execute();
            insertedId = insertResult.identifiers?.[0]?.id;
        }
        catch (err) {
            const msg = err?.message || String(err);
            if (/Unknown column|ER_BAD_FIELD_ERROR|doesn't exist/i.test(msg)) {
                throw new common_1.BadRequestException(`Database schema missing columns (isRemote/pictures?). Restart app with synchronize or run ALTER. Detail: ${msg}`);
            }
            throw err;
        }
        if (!insertedId) {
            throw new common_1.BadRequestException('Failed to create job');
        }
        await this.jobRepo
            .createQueryBuilder()
            .relation(job_entity_1.Job, 'filters')
            .of(insertedId)
            .add(filters.map((f) => f.id));
        const withFilters = await this.jobRepo.findOne({
            where: { id: insertedId },
            relations: ['filters', 'page'],
        });
        if (withFilters && !opts.skipNotification) {
            void this.notificationService.notifyJobCreated(withFilters);
        }
        return {
            ...withFilters,
            ...(withFilters ? this.jobCategories(withFilters) : {}),
            page: this.slimPage(withFilters?.page),
        };
    }
    async findNearbyJobs(query) {
        const { lat, lng, page = 1, limit = 10, radiusKm, search = '', filter, sortBy = 'createdAt', sortOrder = 'DESC', } = query;
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 10));
        const offset = (currentPage - 1) * take;
        const hasRadius = radiusKm !== undefined && radiusKm !== null && radiusKm !== '';
        const radiusMeters = hasRadius ? Number(radiusKm) * 1000 : null;
        if (hasRadius && !(radiusMeters > 0)) {
            throw new common_1.BadRequestException('radiusKm must be a number greater than 0');
        }
        const point = this.toPointSql(Number(lat), Number(lng));
        const distanceSql = `ST_Distance_Sphere(ST_SRID(j.location, 4326), ${point})`;
        const where = ['j.isActive = 1'];
        const params = [];
        if (hasRadius) {
            where.push(`${distanceSql} <= ?`);
            params.push(radiusMeters);
        }
        if (search) {
            where.push('j.description LIKE ?');
            params.push(`%${search}%`);
        }
        const filterIds = this.parseFilterQuery(filter);
        if (filterIds.length) {
            where.push('EXISTS (SELECT 1 FROM job_filters jf WHERE jf.jobId = j.id AND jf.filterId IN (?))');
            params.push(filterIds);
        }
        const orderBy = sortBy === 'distance' ? 'distance' : `j.${this.safeSortColumn(sortBy)}`;
        const direction = this.safeSortOrder(sortOrder);
        const jobs = await this.jobRepo.query(`
    SELECT
      j.*,
      ST_Longitude(j.location) AS lng,
      ST_Latitude(j.location) AS lat,
      p.id AS page_id,
      p.page_name,
      p.username AS page_username,
      p.page_logo,
      p.is_verified AS page_is_verified,
      ${distanceSql} AS distance
    FROM jobs j
    LEFT JOIN pages p ON p.id = j.pageId
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy} ${direction}
    LIMIT ? OFFSET ?
  `, [...params, take, offset]);
        const countResult = await this.jobRepo.query(`
    SELECT COUNT(*) AS total
    FROM jobs j
    WHERE ${where.join(' AND ')}
  `, params);
        const total = Number(countResult[0]?.total || 0);
        const filtersByJob = await this.loadFiltersByJobIds(jobs.map((j) => j.id));
        return {
            data: jobs.map((j) => ({
                ...j,
                ...this.jobCategories({ filters: filtersByJob.get(j.id) }),
                location: {
                    lat: j.lat,
                    lng: j.lng,
                },
                jobType: j.page_id ? 'page' : 'open',
                page: j.page_id
                    ? {
                        id: j.page_id,
                        page_name: j.page_name,
                        username: j.page_username,
                        page_logo: j.page_logo,
                        is_verified: !!j.page_is_verified,
                    }
                    : null,
            })),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async findJobs(query, userId) {
        const { filter, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'DESC', lat, lng, myjobs = false, } = query;
        if (lat && lng && myjobs !== 'true') {
            return this.findNearbyJobs(query);
        }
        const qb = this.jobRepo
            .createQueryBuilder('job')
            .leftJoinAndSelect('job.page', 'page')
            .leftJoinAndSelect('job.filters', 'filters');
        if (myjobs === 'true') {
            if (!userId) {
                throw new common_1.BadRequestException('User not authenticated');
            }
            qb.andWhere('job.createdBy = :userId', { userId });
        }
        else {
            qb.andWhere('job.isActive = true');
        }
        const filterIds = this.parseFilterQuery(filter);
        if (filterIds.length) {
            qb.andWhere('EXISTS (SELECT 1 FROM job_filters jf WHERE jf.jobId = job.id AND jf.filterId IN (:...filterIds))', { filterIds });
        }
        if (search) {
            qb.andWhere('job.description LIKE :search', {
                search: `%${search}%`,
            });
        }
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 10));
        qb.orderBy(`job.${this.safeSortColumn(sortBy)}`, this.safeSortOrder(sortOrder))
            .take(take)
            .skip((currentPage - 1) * take);
        const [jobs, total] = await qb.getManyAndCount();
        return {
            data: jobs.map((job) => ({
                ...job,
                ...this.jobCategories(job),
                pageTaggedJob: job.pageId ? true : false,
                page: job.pageId
                    ? {
                        id: job.page.id,
                        page_name: job.page.page_name,
                        username: job.page.username,
                        page_logo: job.page.page_logo,
                        is_verified: !!job.page.is_verified,
                    }
                    : null,
            })),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async findJobById(id) {
        const job = await this.jobRepo.findOne({
            where: {
                id,
                isActive: true,
            },
            relations: ['filters', 'page'],
        });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        return {
            ...job,
            ...this.jobCategories(job),
            page: this.slimPage(job.page),
        };
    }
    async updateJob(id, data, userId) {
        const job = await this.jobRepo.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        const effectivePageId = data.pageId !== undefined ? data.pageId : (job.pageId ?? null);
        if (effectivePageId) {
            const page = await this.pageRepo.findOne({
                where: { id: effectivePageId },
                relations: ['members'],
            });
            if (!page)
                throw new common_1.BadRequestException('Page not found');
            const member = page.ownerId === userId
                ? { role: 'owner' }
                : page.members.find((m) => m.userId === userId);
            if (!member || !(0, page_permissions_1.roleHasPermission)(member.role, 'jobs.manage')) {
                throw new common_1.BadRequestException('You are not allowed to update jobs for this page');
            }
        }
        else {
            if (job.createdBy !== userId) {
                throw new common_1.BadRequestException('You are not allowed to update this job');
            }
        }
        let locationUpdate = undefined;
        const becomingRemote = data.isRemote === true;
        const becomingOnSite = data.isRemote === false;
        if (becomingRemote && data.location == null) {
            locationUpdate = null;
        }
        else if (data.location) {
            if (typeof data.location?.lat !== 'number' ||
                typeof data.location?.lng !== 'number') {
                throw new common_1.BadRequestException('Valid location (lat/lng) is required');
            }
            locationUpdate = () => this.toPointSql(data.location.lat, data.location.lng);
        }
        else if (becomingOnSite && !job.location) {
            throw new common_1.BadRequestException('Location (lat/lng) is required for on-site jobs');
        }
        const { createdBy, location, filterIds, filterId, filters: _filters, pictures, ...patch } = data;
        const updatePayload = {
            ...patch,
        };
        if (data.pageId !== undefined) {
            updatePayload.pageId = data.pageId ?? null;
        }
        if (locationUpdate !== undefined) {
            updatePayload.location = locationUpdate;
        }
        if (pictures !== undefined) {
            updatePayload.pictures =
                Array.isArray(pictures) && pictures.length
                    ? pictures.slice(0, 4)
                    : null;
        }
        if (data.description !== undefined) {
            updatePayload.description = data.description || null;
        }
        let nextFilters;
        if (filterIds !== undefined || filterId !== undefined) {
            nextFilters = await this.resolveJobFilters({ filterIds, filterId });
        }
        const { location: locRaw, ...scalarPatch } = updatePayload;
        if (Object.keys(scalarPatch).length) {
            await this.jobRepo.update({ id }, scalarPatch);
        }
        if (locRaw !== undefined) {
            await this.jobRepo
                .createQueryBuilder()
                .update(job_entity_1.Job)
                .set({ location: locRaw })
                .where('id = :id', { id })
                .execute();
        }
        if (nextFilters) {
            const current = await this.jobRepo.findOne({
                where: { id },
                relations: ['filters'],
            });
            const oldIds = (current?.filters || []).map((f) => f.id);
            const newIds = nextFilters.map((f) => f.id);
            await this.jobRepo
                .createQueryBuilder()
                .relation(job_entity_1.Job, 'filters')
                .of(id)
                .addAndRemove(newIds, oldIds);
        }
        const updated = await this.jobRepo.findOne({
            where: { id },
            relations: ['filters', 'page'],
        });
        if (!updated)
            throw new common_1.BadRequestException('Failed to load updated job');
        return {
            ...updated,
            ...this.jobCategories(updated),
            page: this.slimPage(updated.page),
        };
    }
};
exports.JobService = JobService;
JobService.SORTABLE_COLUMNS = [
    'id',
    'createdAt',
    'updatedAt',
    'title',
    'salaryAmount',
    'startDate',
    'endDate',
];
exports.JobService = JobService = JobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(3, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notification_service_1.NotificationService])
], JobService);
//# sourceMappingURL=job.service.js.map