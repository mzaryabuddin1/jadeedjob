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
let JobService = class JobService {
    constructor(jobRepo, userRepo, pageRepo, firebaseService) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.firebaseService = firebaseService;
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
        const { location: _location, pageId: _pageId, ...jobData } = data;
        const job = this.jobRepo.create({
            ...jobData,
            createdBy: userId,
            pageId,
            location,
            isActive: true,
        });
        return this.jobRepo.save(job);
    }
    async findNearbyJobs(query) {
        const { lat, lng, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC', radiusKm = 1, } = query;
        const offset = (page - 1) * limit;
        const radiusMeters = radiusKm * 1000;
        const point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
        const jobs = await this.jobRepo.query(`
  SELECT 
    j.*,
    p.id AS page_id,
    p.company_name,
    p.username AS page_username,
    p.company_logo,
    ST_Distance_Sphere(
      ST_SRID(j.location, 4326),
      ST_GeomFromText('POINT(${lng} ${lat})', 4326)
    ) AS distance
  FROM jobs j
  LEFT JOIN pages p ON p.id = j.pageId
  WHERE j.isActive = 1
    AND ST_Distance_Sphere(
      ST_SRID(j.location, 4326),
      ST_GeomFromText('POINT(${lng} ${lat})', 4326)
    ) <= ${radiusMeters}
  ${search ? `AND j.description LIKE '%${search}%'` : ''}
  ORDER BY ${sortBy} ${sortOrder}
  LIMIT ${limit}
  OFFSET ${offset}
`);
        const countResult = await this.jobRepo.query(`
    SELECT COUNT(*) AS count
    FROM jobs j
    WHERE j.isActive = 1
    AND ST_Distance_Sphere(j.location, ${point}) <= ${radiusMeters}
    ${search ? `AND j.description LIKE '%${search}%'` : ''}
  `);
        const total = Number(countResult[0].count);
        return {
            data: jobs.map((j) => ({
                ...j,
                pageTaggedJob: j.page_id ? true : false,
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
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async findJobs(query, userId) {
        const { filter, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'DESC', lat, lng, myjobs = false, } = query;
        if (lat && lng && myjobs !== 'true') {
            return this.findNearbyJobs(query);
        }
        const where = {};
        if (myjobs === 'true') {
            if (!userId) {
                throw new common_1.BadRequestException('User not authenticated');
            }
            where.createdBy = userId;
        }
        else {
            where.isActive = true;
        }
        if (filter)
            where.filterId = Number(filter);
        if (search) {
            where.description = (0, typeorm_2.Raw)((alias) => `${alias} LIKE '%${search}%'`);
        }
        const [jobs, total] = await this.jobRepo.findAndCount({
            where,
            relations: ['page'],
            order: { [sortBy]: sortOrder.toUpperCase() },
            take: limit,
            skip: (page - 1) * limit,
        });
        return {
            data: jobs.map((job) => ({
                ...job,
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
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
        };
    }
    async findJobById(id) {
        const job = await this.jobRepo.findOne({
            where: {
                id,
                isActive: true,
            },
        });
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${id} not found`);
        }
        return job;
    }
};
exports.JobService = JobService;
exports.JobService = JobService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], JobService);
//# sourceMappingURL=job.service.js.map