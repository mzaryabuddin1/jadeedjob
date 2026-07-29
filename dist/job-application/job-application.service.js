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
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const company_permissions_1 = require("../pages/company-permissions");
const chat_service_1 = require("../chat/chat.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const moderation_service_1 = require("../moderation/moderation.service");
let JobApplicationService = class JobApplicationService {
    constructor(jobAppRepo, jobRepo, userRepo, ratingRepo, pageMemberRepo, companyRepo, notificationsService, chatService, idempotencyService, moderationService) {
        this.jobAppRepo = jobAppRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.ratingRepo = ratingRepo;
        this.pageMemberRepo = pageMemberRepo;
        this.companyRepo = companyRepo;
        this.notificationsService = notificationsService;
        this.chatService = chatService;
        this.idempotencyService = idempotencyService;
        this.moderationService = moderationService;
    }
    formatDemand(job) {
        const currency = job.currency || '₨';
        const amount = typeof job.salaryAmount === 'number'
            ? job.salaryAmount.toLocaleString()
            : '0';
        if (job.salaryType === 'daily-wage')
            return `${currency} ${amount} / day`;
        if (job.salaryType === 'hourly')
            return `${currency} ${amount} / hour`;
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
    getEmployerName(job) {
        return (job.page?.company_name ||
            job.creator?.full_name ||
            [job.creator?.firstName, job.creator?.lastName].filter(Boolean).join(' ') ||
            'Individual');
    }
    getJobSummary(job) {
        const employerName = this.getEmployerName(job);
        return {
            id: job.id,
            title: job.title,
            description: job.description,
            salaryType: job.salaryType,
            salaryAmount: job.salaryAmount,
            currency: job.currency,
            filter: job.filter ?? null,
            companyName: employerName,
            employerName,
            employerType: job.pageId ? 'company' : 'individual',
            status: job.status || (job.isActive ? 'active' : 'closed'),
            payType: job.salaryType,
        };
    }
    getEmployerSummary(job) {
        const name = this.getEmployerName(job);
        return {
            id: job.pageId || job.createdBy,
            type: job.pageId ? 'company' : 'individual',
            companyId: job.pageId || null,
            name,
            companyName: name,
            logoUrl: job.page?.company_logo || job.creator?.profile_photo || null,
        };
    }
    async canManageJob(job, userId) {
        if (!job.pageId)
            return job.createdBy === userId;
        const company = job.page ||
            (await this.companyRepo.findOne({ where: { id: job.pageId } }));
        if (!company || company.verificationStatus !== 'approved')
            return false;
        if (company.ownerId === userId)
            return true;
        const member = await this.pageMemberRepo.findOne({
            where: { pageId: job.pageId, userId },
        });
        if (!member || member.hasAccess === false)
            return false;
        return (0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions).viewApplicants;
    }
    async apply(data) {
        return this.idempotencyService.execute(data.applicantId, 'job_application_apply', data.idempotencyKey, {
            jobId: data.jobId,
            bidAmount: data.bidAmount ?? null,
            bidCurrency: data.bidCurrency ?? null,
        }, async () => {
            const result = await this.jobAppRepo.manager.transaction(async (manager) => this.applyTransaction(data, manager));
            const conversation = await this.chatService.ensureApplicationConversation(result.app.id);
            await this.notificationsService.create({
                userId: result.job.createdBy,
                type: 'job_application',
                title: 'New application received',
                message: `Someone applied to ${result.job.title}.`,
                data: {
                    jobId: result.job.id,
                    applicationId: result.app.id,
                    chatId: conversation.id,
                    conversationId: conversation.id,
                    companyId: result.job.pageId ?? null,
                },
            });
            return this.applicationMutationResponse(result.app, conversation.id);
        });
    }
    async getApplicationsByUser(userId, page = 1, limit = 10, status) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 10));
        const where = { applicantId: userId };
        if (status && status !== 'all') {
            where.status = status;
        }
        else {
            where.status = (0, typeorm_2.Not)('withdrawn');
        }
        const [applications, total] = await this.jobAppRepo.findAndCount({
            where,
            relations: ['job', 'job.page', 'job.creator', 'job.filter'],
            skip: (currentPage - 1) * take,
            take,
            order: { createdAt: 'DESC' },
        });
        const rows = await Promise.all(applications.map(async (application) => {
            const conversation = await this.chatService.ensureApplicationConversation(application.id);
            return {
                applicationId: application.id,
                id: application.id,
                status: application.status,
                bidAmount: application.bidAmount === null
                    ? null
                    : Number(application.bidAmount),
                bidCurrency: application.bidCurrency || null,
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
                job: this.getJobSummary(application.job),
                employer: this.getEmployerSummary(application.job),
                chatId: conversation.id,
                conversationId: conversation.id,
                legacyApplicationChatId: application.id,
            };
        }));
        return {
            data: rows,
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async getApplicationHistory(userId, status = 'completed', page = 1, limit = 20) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [applications, total] = await this.jobAppRepo.findAndCount({
            where: { applicantId: userId, status },
            relations: ['job', 'job.page', 'job.creator', 'job.filter'],
            order: { updatedAt: 'DESC' },
            skip: (currentPage - 1) * take,
            take,
        });
        return {
            data: applications.map((application) => ({
                id: application.id,
                applicationId: application.id,
                jobTitle: application.job?.title,
                amount: application.job?.salaryAmount,
                description: application.job?.description,
                completedAt: application.completedAt || application.updatedAt,
                status: application.status,
                employer: this.getEmployerSummary(application.job),
                paymentStatus: 'pending',
            })),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
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
            relations: ['page', 'creator', 'filter'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (!(await this.canManageJob(job, employerId))) {
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
        const [pending, accepted, rejected, withdrawn, completed] = await Promise.all([
            this.jobAppRepo.count({ where: { jobId, status: 'pending' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'accepted' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'rejected' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'withdrawn' } }),
            this.jobAppRepo.count({ where: { jobId, status: 'completed' } }),
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
            data: await Promise.all(applications.map(async (application) => {
                const applicant = application.applicant;
                const review = reviewsByApplicationId.get(application.id);
                const ratingAverage = Number(applicant?.ratingAverage || 0);
                const ratingCount = Number(applicant?.ratingCount || 0);
                const conversation = await this.chatService.ensureApplicationConversation(application.id);
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
                    bidAmount: application.bidAmount === null
                        ? null
                        : Number(application.bidAmount),
                    bidCurrency: application.bidCurrency || null,
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
                    chatId: conversation.id,
                    conversationId: conversation.id,
                    legacyApplicationChatId: application.id,
                    createdAt: application.createdAt,
                    updatedAt: application.updatedAt,
                };
            })),
            counts: {
                pending,
                accepted,
                rejected,
                withdrawn,
                completed,
                all: pending + accepted + rejected + withdrawn + completed,
            },
            job: this.getJobSummary(job),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async updateStatus(id, status, employerId) {
        if (!['accepted', 'rejected', 'pending', 'completed'].includes(status)) {
            throw new common_1.BadRequestException('Employer cannot set this application status');
        }
        const saved = await this.jobAppRepo.manager.transaction(async (manager) => {
            const app = await manager.getRepository(job_application_entity_1.JobApplication).findOne({
                where: { id },
                relations: ['job', 'job.page', 'job.creator'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!app)
                throw new common_1.NotFoundException('Application not found');
            if (!(await this.canManageJob(app.job, employerId))) {
                throw new common_1.ForbiddenException('You cannot update this application');
            }
            this.assertEmployerTransition(app.status, status);
            if (status === 'accepted') {
                await this.assertVacancyAvailable(app.job, manager, app.id);
            }
            app.status = status;
            app.completedAt = status === 'completed' ? new Date() : null;
            app.withdrawnAt = null;
            return manager.save(app);
        });
        await this.chatService.syncApplicationConversation(saved.id, saved.status);
        const conversation = await this.chatService.ensureApplicationConversation(saved.id);
        const job = await this.jobRepo.findOne({
            where: { id: saved.jobId },
            relations: ['page'],
        });
        await this.notificationsService.create({
            userId: saved.applicantId,
            type: 'application_status',
            title: 'Application status updated',
            message: `Your application for ${job.title} is now ${status}.`,
            data: {
                jobId: saved.jobId,
                applicationId: saved.id,
                chatId: conversation.id,
                conversationId: conversation.id,
                companyId: job.pageId ?? null,
            },
        });
        return this.applicationMutationResponse(saved, conversation.id);
    }
    async withdraw(id, applicantId) {
        const app = await this.jobAppRepo.findOne({
            where: { id },
            relations: ['job'],
        });
        if (!app)
            throw new common_1.NotFoundException('Application not found');
        if (app.applicantId !== applicantId) {
            throw new common_1.ForbiddenException('You cannot withdraw this application');
        }
        if (['accepted', 'completed'].includes(app.status)) {
            throw new common_1.BadRequestException('This application cannot be withdrawn');
        }
        if (!['pending', 'rejected'].includes(app.status)) {
            throw new common_1.BadRequestException('This application cannot be withdrawn');
        }
        app.status = 'withdrawn';
        app.withdrawnAt = new Date();
        const saved = await this.jobAppRepo.save(app);
        await this.chatService.syncApplicationConversation(saved.id, saved.status);
        const conversation = await this.chatService.ensureApplicationConversation(saved.id);
        await this.notificationsService.create({
            userId: app.job.createdBy,
            type: 'application_withdrawn',
            title: 'Application withdrawn',
            message: `An application for ${app.job.title} was withdrawn.`,
            data: {
                jobId: app.jobId,
                applicationId: app.id,
                chatId: conversation.id,
                conversationId: conversation.id,
                companyId: app.job.pageId ?? null,
            },
        });
        return {
            message: 'Application withdrawn successfully',
            application: this.applicationMutationResponse(saved, conversation.id),
        };
    }
    async applyTransaction(data, manager) {
        const job = await manager.getRepository(job_entity_1.Job).findOne({
            where: { id: data.jobId },
            relations: ['page', 'creator'],
            lock: { mode: 'pessimistic_read' },
        });
        if (!job ||
            !job.isActive ||
            job.status !== 'active' ||
            (job.pageId && job.page?.verificationStatus !== 'approved')) {
            throw new common_1.BadRequestException('Job does not exist or is not active');
        }
        if (job.createdBy === data.applicantId) {
            throw new common_1.BadRequestException('You cannot apply to your own job');
        }
        await this.moderationService.assertInteractionAllowed(data.applicantId, job.pageId ? 'company' : 'user', job.pageId || job.createdBy);
        const negotiable = job.salaryType === 'negotiable';
        if (negotiable && !(Number(data.bidAmount) > 0)) {
            throw new common_1.BadRequestException('A positive bidAmount is required for negotiable jobs');
        }
        if (!negotiable && data.bidAmount !== undefined) {
            throw new common_1.BadRequestException('Bids are only allowed for negotiable jobs');
        }
        let app = await manager.getRepository(job_application_entity_1.JobApplication).findOne({
            where: { jobId: data.jobId, applicantId: data.applicantId },
            lock: { mode: 'pessimistic_write' },
        });
        if (app && app.status !== 'withdrawn') {
            throw new common_1.BadRequestException('You already applied to this job');
        }
        if (!app) {
            app = manager.getRepository(job_application_entity_1.JobApplication).create({
                jobId: data.jobId,
                applicantId: data.applicantId,
            });
        }
        app.status = 'pending';
        app.withdrawnAt = null;
        app.completedAt = null;
        app.sourceInvitationId = null;
        app.bidAmount = negotiable ? Number(data.bidAmount) : null;
        app.bidCurrency = negotiable
            ? String(data.bidCurrency || job.currency || '').trim() || null
            : null;
        app.lastApplyRequestId =
            String(data.idempotencyKey || '').trim() || null;
        return { app: await manager.save(app), job };
    }
    assertEmployerTransition(current, next) {
        if (current === next)
            return;
        const allowed = {
            pending: ['accepted', 'rejected'],
            rejected: ['pending'],
            accepted: ['completed'],
        };
        if (!allowed[current]?.includes(next)) {
            throw new common_1.BadRequestException(`Application cannot move from ${current} to ${next}`);
        }
    }
    async assertVacancyAvailable(job, manager, excludedApplicationId) {
        const lockedJob = await manager.getRepository(job_entity_1.Job).findOne({
            where: { id: job.id },
            lock: { mode: 'pessimistic_write' },
        });
        if (!lockedJob ||
            !lockedJob.isActive ||
            lockedJob.status !== 'active') {
            throw new common_1.BadRequestException('Job is no longer active');
        }
        if (!lockedJob.vacancies)
            return;
        const occupied = await manager
            .getRepository(job_application_entity_1.JobApplication)
            .createQueryBuilder('application')
            .where('application.jobId = :jobId', { jobId: lockedJob.id })
            .andWhere('application.id != :excludedApplicationId', {
            excludedApplicationId,
        })
            .andWhere('application.status IN (:...statuses)', {
            statuses: ['accepted', 'completed'],
        })
            .getCount();
        if (occupied >= lockedJob.vacancies) {
            throw new common_1.BadRequestException({
                code: 'APPLICATION_VACANCIES_FILLED',
                message: 'No vacancies remain for this job',
            });
        }
    }
    applicationMutationResponse(application, conversationId) {
        return {
            id: application.id,
            applicationId: application.id,
            jobId: application.jobId,
            applicantId: application.applicantId,
            status: application.status,
            bidAmount: application.bidAmount === null
                ? null
                : Number(application.bidAmount),
            bidCurrency: application.bidCurrency || null,
            chatId: conversationId,
            conversationId,
            legacyApplicationChatId: application.id,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
        };
    }
};
exports.JobApplicationService = JobApplicationService;
exports.JobApplicationService = JobApplicationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(rating_entity_1.Rating)),
    __param(4, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(5, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        chat_service_1.ChatService,
        idempotency_service_1.IdempotencyService,
        moderation_service_1.ModerationService])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map