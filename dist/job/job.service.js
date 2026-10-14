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
const filter_entity_1 = require("../filter/entities/filter.entity");
let JobService = class JobService {
    constructor(jobRepo, userRepo, pageRepo, filterRepo, firebaseService) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.filterRepo = filterRepo;
        this.firebaseService = firebaseService;
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
    async createJob(data, userId) {
        let pageId = null;
        if (data.pageId) {
            const page = await this.pageRepo.findOne({
                where: { id: data.pageId },
                relations: ['members'],
            });
            if (!page) {
                throw new common_1.BadRequestException('Page not found');
            }
            const member = page.ownerId === userId
                ? { role: 'owner' }
                : page.members.find((m) => m.userId === userId);
            if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
                throw new common_1.BadRequestException('You are not allowed to create jobs for this page');
            }
            pageId = page.id;
        }
        if (!data.location || data.isRemote === false) {
            if (typeof data.location?.lat !== 'number' ||
                typeof data.location?.lng !== 'number') {
                throw new common_1.BadRequestException('Valid location is required');
            }
        }
        const location = data.isRemote === true
            ? null
            : () => `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;
        const filters = await this.resolveJobFilters(data);
        const primaryFilterId = filters[0].id;
        const { location: _location, pageId: _pageId, filterIds: _filterIds, filterId: _filterId, filters: _filters, ...jobData } = data;
        const insertResult = await this.jobRepo.insert({
            ...jobData,
            filterId: primaryFilterId,
            createdBy: userId,
            pageId: pageId ?? null,
            location,
            isActive: true,
        });
        const insertedId = insertResult.identifiers?.[0]?.id;
        if (!insertedId) {
            throw new common_1.BadRequestException('Failed to create job');
        }
        const savedJob = await this.jobRepo.findOne({
            where: { id: insertedId },
            relations: ['filters', 'filter'],
        });
        if (!savedJob) {
            throw new common_1.BadRequestException('Failed to load created job');
        }
        savedJob.filters = filters;
        await this.jobRepo.save(savedJob);
        const withFilters = await this.jobRepo.findOne({
            where: { id: insertedId },
            relations: ['filters', 'filter', 'page'],
        });
        for (const f of filters) {
            try {
                await this.firebaseService.sendToFilterTopic(f.id, 'New Job Posted', withFilters?.title ?? 'A new job matches your preferences!', {
                    jobId: String(insertedId),
                    filterId: String(f.id),
                    filterIds: filters.map((x) => x.id).join(','),
                });
            }
            catch {
            }
        }
        return withFilters;
    }
    async findNearbyJobs(query) {
        const { lat, lng, page = 1, limit = 10, radiusKm = 1, search = '', sortBy = 'createdAt', sortOrder = 'DESC', } = query;
        const currentPage = Number(page);
        const take = Number(limit);
        const offset = (currentPage - 1) * take;
        const radiusMeters = Number(radiusKm) * 1000;
        const point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
        const jobs = await this.jobRepo.query(`
    SELECT
      j.*,
      ST_X(j.location) AS lng,
      ST_Y(j.location) AS lat,
      p.id AS page_id,
      p.company_name,
      p.username AS page_username,
      p.company_logo,
      ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) AS distance
    FROM jobs j
    LEFT JOIN pages p ON p.id = j.pageId
    WHERE j.isActive = 1
      AND ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${take}
    OFFSET ${offset}
  `);
        const countResult = await this.jobRepo.query(`
    SELECT COUNT(*) AS total
    FROM jobs j
    WHERE j.isActive = 1
      AND ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
  `);
        const total = Number(countResult[0]?.total || 0);
        return {
            data: jobs.map((j) => ({
                ...j,
                location: {
                    lat: j.lat,
                    lng: j.lng,
                },
                jobType: j.page_id ? 'page' : 'open',
                page: j.page_id
                    ? {
                        id: j.page_id,
                        company_name: j.company_name,
                        username: j.page_username,
                        company_logo: j.company_logo,
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
            .leftJoinAndSelect('job.filter', 'filter')
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
        if (filter) {
            const filterId = Number(filter);
            qb.andWhere('(job.filterId = :filterId OR filters.id = :filterId)', { filterId });
        }
        if (search) {
            qb.andWhere('job.description LIKE :search', {
                search: `%${search}%`,
            });
        }
        qb.orderBy(`job.${sortBy}`, String(sortOrder).toUpperCase())
            .take(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const [jobs, total] = await qb.getManyAndCount();
        return {
            data: jobs.map((job) => ({
                ...job,
                filterIds: (job.filters || []).map((f) => f.id),
                pageTaggedJob: job.pageId ? true : false,
                page: job.pageId
                    ? {
                        id: job.page.id,
                        company_name: job.page.company_name,
                        username: job.page.username,
                        company_logo: job.page.company_logo,
                    }
                    : null,
            })),
            total,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
        };
    }
    async findJobById(id) {
        const job = await this.jobRepo.findOne({
            where: {
                id,
                isActive: true,
            },
            relations: ['filters', 'filter', 'page'],
        });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        return {
            ...job,
            filterIds: (job.filters || []).map((f) => f.id),
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
            if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
                throw new common_1.BadRequestException('You are not allowed to update jobs for this page');
            }
        }
        else {
            if (job.createdBy !== userId) {
                throw new common_1.BadRequestException('You are not allowed to update this job');
            }
        }
        let locationUpdate = undefined;
        if (data.isRemote === true) {
            locationUpdate = null;
        }
        else if (data.location) {
            if (typeof data.location?.lat !== 'number' ||
                typeof data.location?.lng !== 'number') {
                throw new common_1.BadRequestException('Valid location is required');
            }
            locationUpdate = () => `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;
        }
        const { createdBy, location, filterIds, filterId, filters: _filters, ...patch } = data;
        const updatePayload = {
            ...patch,
        };
        if (data.pageId !== undefined) {
            updatePayload.pageId = data.pageId ?? null;
        }
        if (locationUpdate !== undefined) {
            updatePayload.location = locationUpdate;
        }
        let nextFilters;
        if (filterIds !== undefined || filterId !== undefined) {
            nextFilters = await this.resolveJobFilters({ filterIds, filterId });
            updatePayload.filterId = nextFilters[0].id;
        }
        await this.jobRepo.update({ id }, updatePayload);
        if (nextFilters) {
            const jobWithRelations = await this.jobRepo.findOne({
                where: { id },
                relations: ['filters'],
            });
            if (jobWithRelations) {
                jobWithRelations.filters = nextFilters;
                await this.jobRepo.save(jobWithRelations);
            }
        }
        const updated = await this.jobRepo.findOne({
            where: { id },
            relations: ['filters', 'filter', 'page'],
        });
        if (!updated)
            throw new common_1.BadRequestException('Failed to load updated job');
        return {
            ...updated,
            filterIds: (updated.filters || []).map((f) => f.id),
        };
    }
};
exports.JobService = JobService;
exports.JobService = JobService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(3, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], JobService);
//# sourceMappingURL=job.service.js.map