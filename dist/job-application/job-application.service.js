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
const rating_entity_1 = require("../rating/entities/rating.entity");
let JobApplicationService = class JobApplicationService {
    constructor(jobAppRepo, jobRepo, userRepo, ratingRepo) {
        this.jobAppRepo = jobAppRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.ratingRepo = ratingRepo;
    }
    formatDemand(job) {
        const currency = job.currency || '₨';
        const amount = typeof job.salaryAmount === 'number'
            ? job.salaryAmount.toLocaleString()
            : '0';
        if (job.salaryType === 'daily-wage')
            return `${currency} ${amount} / day`;
        if (job.salaryType === 'monthly')
            return `${currency} ${amount} / month`;
        return `${currency} ${amount}`;
    }
    getApplicantName(applicant) {
        if (!applicant)
            return '';
        const fullName = (applicant.full_name || '').trim();
        if (fullName)
            return fullName;
        return [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
    }
    getJobSummary(job) {
        return {
            id: job.id,
            title: job.title,
            description: job.description,
            salaryType: job.salaryType,
            salaryAmount: job.salaryAmount,
            currency: job.currency,
            filter: job.filter ?? null,
        };
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
    async getReceivedApplicationsForJob(jobId, employerId, query = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const status = query.status || 'all';
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        if (job.createdBy !== employerId) {
            throw new common_1.ForbiddenException('You cannot view applications for this job');
        }
        const baseWhere = { jobId };
        const where = status === 'all'
            ? baseWhere
            : {
                ...baseWhere,
                status,
            };
        const [applications, total] = await this.jobAppRepo.findAndCount({
            where,
            relations: ['applicant'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        const [pending, accepted, rejected] = await Promise.all([
            this.jobAppRepo.count({ where: { jobId, status: 'pending' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'accepted' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'rejected' } }),
        ]);
        const applicationIds = applications.map((application) => application.id);
        const reviews = applicationIds.length
            ? await this.ratingRepo.find({
                where: {
                    jobApplicationId: (0, typeorm_2.In)(applicationIds),
                    givenBy: employerId,
                },
            })
            : [];
        const reviewsByApplicationId = new Map(reviews.map((review) => [review.jobApplicationId, review]));
        const demand = this.formatDemand(job);
        return {
            data: applications.map((application) => {
                const applicant = application.applicant;
                const review = reviewsByApplicationId.get(application.id);
                const ratingAverage = Number(applicant?.ratingAverage || 0);
                const ratingCount = Number(applicant?.ratingCount || 0);
                return {
                    id: application.id,
                    jobApplicationId: application.id,
                    jobId: application.jobId,
                    applicantId: application.applicantId,
                    name: this.getApplicantName(applicant),
                    avatarUrl: applicant?.profile_photo ?? null,
                    demand,
                    rating: ratingAverage,
                    ratingCount,
                    status: application.status,
                    lastReview: review
                        ? {
                            stars: review.stars,
                            comment: review.comment || '',
                        }
                        : null,
                    applicant: {
                        id: applicant?.id,
                        firstName: applicant?.firstName ?? '',
                        lastName: applicant?.lastName ?? '',
                        full_name: applicant?.full_name ?? null,
                        profile_photo: applicant?.profile_photo ?? null,
                        city: applicant?.city ?? null,
                        ratingAverage,
                        ratingCount,
                    },
                    createdAt: application.createdAt,
                    updatedAt: application.updatedAt,
                };
            }),
            counts: {
                pending,
                accepted,
                rejected,
                all: pending + accepted + rejected,
            },
            job: this.getJobSummary(job),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async updateStatus(id, status, employerId) {
        const app = await this.jobAppRepo.findOne({
            where: { id },
            relations: ['job'],
        });
        if (!app) {
            throw new common_1.BadRequestException('Application not found');
        }
        if (app.job.createdBy !== employerId) {
            throw new common_1.ForbiddenException('You cannot update this application');
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
    __param(3, (0, typeorm_1.InjectRepository)(rating_entity_1.Rating)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map