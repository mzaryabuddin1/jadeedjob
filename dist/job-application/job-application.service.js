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
exports.JobApplicationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_application_entity_1 = require("./entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
let JobApplicationService = class JobApplicationService {
    constructor(jobAppRepo, jobRepo, userRepo) {
        this.jobAppRepo = jobAppRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
    }
    async apply(data) {
        const job = await this.jobRepo.findOne({
            where: { id: data.jobId, isActive: true },
        });
        if (!job) {
            throw new common_1.BadRequestException('Job does not exist or is not active');
        }
        const existing = await this.jobAppRepo.findOne({
            where: {
                jobId: data.jobId,
                applicantId: data.applicantId,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('You already applied to this job');
        }
        const app = this.jobAppRepo.create({
            jobId: data.jobId,
            applicantId: data.applicantId,
        });
        return this.jobAppRepo.save(app);
    }
    async getApplicationsByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [applications, total] = await this.jobAppRepo.findAndCount({
            where: { applicantId: userId },
            relations: ['job'],
            skip,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return {
            data: applications,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async getApplicationsByJob(jobId) {
        return this.jobAppRepo.find({
            where: { jobId },
            relations: ['applicant'],
        });
    }
    async updateStatus(id, status) {
        const app = await this.jobAppRepo.findOne({ where: { id } });
        if (!app) {
            throw new common_1.BadRequestException('Application not found');
        }
        app.status = status;
        return this.jobAppRepo.save(app);
    }
};
exports.JobApplicationService = JobApplicationService;
exports.JobApplicationService = JobApplicationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map