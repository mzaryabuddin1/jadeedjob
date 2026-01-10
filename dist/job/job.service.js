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
let JobService = class JobService {
    constructor(jobRepo, userRepo, firebaseService) {
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.firebaseService = firebaseService;
    }
    async createJob(data) {
        const { location, ...rest } = data;
        const job = this.jobRepo.create({
            ...rest,
            location: () => `ST_GeomFromText('POINT(${location.lng} ${location.lat})')`,
        });
        const savedJob = await this.jobRepo.save(job);
        return savedJob;
    }
    async findNearbyJobs(query) {
        const { lat, lng, page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC', radiusKm = 1, } = query;
        const offset = (page - 1) * limit;
        const radiusMeters = radiusKm * 1000;
        const jobs = await this.jobRepo.query(`
      SELECT 
        j.*, 
        ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) AS distance
      FROM jobs j
      WHERE j.isActive = 1
      AND ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `);
        const countResult = await this.jobRepo.query(`
      SELECT COUNT(*) AS count
      FROM jobs j
      WHERE j.isActive = 1
      AND ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
    `);
        const total = Number(countResult[0].count);
        return {
            data: jobs,
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
            order: { [sortBy]: sortOrder.toUpperCase() },
            take: limit,
            skip: (page - 1) * limit,
        });
        return {
            data: jobs,
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
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], JobService);
//# sourceMappingURL=job.service.js.map