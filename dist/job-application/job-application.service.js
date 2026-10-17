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
const application_notifier_1 = require("./application-notifier");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const job_employer_util_1 = require("../job/job-employer.util");
const PRIVATE_USER_FIELDS = [
    'passwordHash',
    'passwordSalt',
    'fcmTokens',
    'notification_settings',
    'googleId',
    'facebookId',
    'bank_name',
    'account_number',
    'iban',
    'branch_name',
    'swift_code',
    'notes',
    'kyc_status',
    'verified_by_admin_id',
    'verification_date',
    'rejection_reason',
    'isBanned',
];
let JobApplicationService = class JobApplicationService {
    constructor(jobAppRepo, jobRepo, userRepo, pageRepo, applicationNotifier) {
        this.jobAppRepo = jobAppRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.applicationNotifier = applicationNotifier;
    }
    async apply(data) {
        const job = await this.jobRepo.findOne({
            where: { id: data.jobId, isActive: true },
        });
        if (!job) {
            throw new common_1.BadRequestException('Job does not exist or is not active');
        }
        if (await (0, job_employer_util_1.isJobEmployer)(this.pageRepo, job, data.applicantId)) {
            throw new common_1.BadRequestException("You cannot apply to your own (or your company's) job");
        }
        const app = await this.jobAppRepo.manager.transaction(async (manager) => {
            await manager
                .createQueryBuilder(job_entity_1.Job, 'j')
                .select('j.id')
                .where('j.id = :id', { id: data.jobId })
                .setLock('pessimistic_write')
                .getOne();
            const existing = await manager.findOne(job_application_entity_1.JobApplication, {
                where: { jobId: data.jobId, applicantId: data.applicantId },
            });
            if (existing) {
                throw new common_1.BadRequestException('You already applied to this job');
            }
            return manager.save(manager.create(job_application_entity_1.JobApplication, {
                jobId: data.jobId,
                applicantId: data.applicantId,
            }));
        });
        await this.applicationNotifier.onApplied(job, app);
        return app;
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
    async getApplicationsByJob(jobId, userId) {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'createdBy', 'pageId'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (!(await (0, job_employer_util_1.isJobEmployer)(this.pageRepo, job, userId))) {
            throw new common_1.ForbiddenException('Only the employer can see the applications of this job');
        }
        const apps = await this.jobAppRepo.find({
            where: { jobId },
            relations: ['applicant'],
            order: { createdAt: 'DESC' },
        });
        for (const a of apps) {
            for (const field of PRIVATE_USER_FIELDS) {
                delete a.applicant?.[field];
            }
        }
        return apps;
    }
    async updateStatus(id, status, userId) {
        const app = await this.jobAppRepo.findOne({
            where: { id },
            relations: ['job'],
        });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        if (!(await (0, job_employer_util_1.isJobEmployer)(this.pageRepo, app.job, userId))) {
            throw new common_1.ForbiddenException('Only the employer can accept or reject applications');
        }
        if (app.status !== 'pending') {
            throw new common_1.BadRequestException(`This application is already ${app.status}`);
        }
        const res = await this.jobAppRepo.update({ id, status: 'pending' }, { status, decidedAt: new Date(), decidedBy: userId });
        if (!res.affected) {
            throw new common_1.BadRequestException('This application was already decided');
        }
        const updated = await this.jobAppRepo.findOneOrFail({ where: { id } });
        if (status === 'accepted') {
            void this.applicationNotifier.notifyAccepted(updated, app.job);
        }
        return updated;
    }
};
exports.JobApplicationService = JobApplicationService;
exports.JobApplicationService = JobApplicationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        application_notifier_1.ApplicationNotifier])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map