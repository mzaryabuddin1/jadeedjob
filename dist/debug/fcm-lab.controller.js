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
exports.FcmLabController = exports.DebugLabGuard = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const job_entity_1 = require("../job/entities/job.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_application_service_1 = require("../job-application/job-application.service");
const application_notifier_1 = require("../job-application/application-notifier");
const notification_queue_entity_1 = require("../notification/notification-queue.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const notification_service_1 = require("../notification/notification.service");
const mail_service_1 = require("../notification/mail.service");
const job_service_1 = require("../job/job.service");
const notification_settings_1 = require("../notification/notification-settings");
let DebugLabGuard = class DebugLabGuard {
    canActivate(context) {
        const expected = process.env.DEBUG_LAB_KEY;
        if (!expected)
            throw new common_1.NotFoundException();
        const given = String(context.switchToHttp().getRequest().headers['x-debug-key'] ?? '');
        const a = Buffer.from(given);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !(0, crypto_1.timingSafeEqual)(a, b)) {
            throw new common_1.UnauthorizedException('Invalid debug key');
        }
        return true;
    }
};
exports.DebugLabGuard = DebugLabGuard;
exports.DebugLabGuard = DebugLabGuard = __decorate([
    (0, common_1.Injectable)()
], DebugLabGuard);
let FcmLabController = class FcmLabController {
    constructor(userRepo, jobRepo, appRepo, queueRepo, jobApplicationService, applicationNotifier, firebaseService, notificationService, mailService, jobService) {
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.appRepo = appRepo;
        this.queueRepo = queueRepo;
        this.jobApplicationService = jobApplicationService;
        this.applicationNotifier = applicationNotifier;
        this.firebaseService = firebaseService;
        this.notificationService = notificationService;
        this.mailService = mailService;
        this.jobService = jobService;
    }
    async status() {
        const [usersTotal, usersWithTokens] = await Promise.all([
            this.userRepo.count(),
            this.userRepo
                .createQueryBuilder('u')
                .where("u.fcmTokens IS NOT NULL AND u.fcmTokens != ''")
                .getCount(),
        ]);
        return {
            nodeEnv: process.env.NODE_ENV ?? '(not set)',
            firebaseProjectId: this.firebaseService.getProjectId() ?? '(unknown)',
            smtpConfigured: this.mailService.isConfigured,
            deepLinkTemplate: process.env.NOTIFICATION_JOB_PATH || '/job/{id}',
            usersTotal,
            usersWithTokens,
        };
    }
    async users(search, limit = '200') {
        const take = Math.min(500, Math.max(1, Number(limit) || 200));
        const term = String(search ?? '').trim();
        const users = await this.userRepo.find({
            select: [
                'id',
                'firstName',
                'lastName',
                'email',
                'phone',
                'isBanned',
                'fcmTokens',
                'filter_preferences',
                'notification_settings',
                'createdAt',
            ],
            where: term
                ? [
                    { firstName: (0, typeorm_2.Like)(`%${term}%`) },
                    { lastName: (0, typeorm_2.Like)(`%${term}%`) },
                    { email: (0, typeorm_2.Like)(`%${term}%`) },
                    { phone: (0, typeorm_2.Like)(`%${term}%`) },
                ]
                : undefined,
            order: { id: 'DESC' },
            take,
        });
        return users.map((u) => ({
            id: u.id,
            name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            email: u.email,
            phone: u.phone,
            isBanned: u.isBanned,
            fcmTokens: (u.fcmTokens || []).filter(Boolean),
            filterPreferences: (u.filter_preferences || []).map(Number),
            notificationSettings: (0, notification_settings_1.resolveNotificationSettings)(u.notification_settings),
            createdAt: u.createdAt,
        }));
    }
    async jobs(limit = '60') {
        const take = Math.min(200, Math.max(1, Number(limit) || 60));
        const jobs = await this.jobRepo.find({
            order: { id: 'DESC' },
            take,
            relations: ['filters'],
        });
        const jobIds = jobs.map((j) => j.id);
        const creatorIds = [...new Set(jobs.map((j) => j.createdBy))];
        const counts = jobIds.length
            ? await this.appRepo
                .createQueryBuilder('a')
                .select('a.jobId', 'jobId')
                .addSelect('COUNT(*)', 'n')
                .where('a.jobId IN (:...jobIds)', { jobIds })
                .groupBy('a.jobId')
                .getRawMany()
            : [];
        const countByJob = new Map(counts.map((c) => [Number(c.jobId), Number(c.n)]));
        const creators = creatorIds.length
            ? await this.userRepo.find({
                where: { id: (0, typeorm_2.In)(creatorIds) },
                select: [
                    'id',
                    'firstName',
                    'lastName',
                    'fcmTokens',
                    'email',
                    'notification_settings',
                ],
            })
            : [];
        const creatorById = new Map(creators.map((u) => [u.id, u]));
        return {
            timing: this.applicationNotifier.getTiming(),
            jobs: jobs.map((j) => {
                const c = creatorById.get(j.createdBy);
                const settings = (0, notification_settings_1.resolveNotificationSettings)(c?.notification_settings);
                const devices = (c?.fcmTokens || []).filter(Boolean).length;
                return {
                    id: j.id,
                    title: j.title,
                    isActive: j.isActive,
                    isTest: j.title.startsWith('[FCM TEST]'),
                    filters: (j.filters || []).map((f) => f.name),
                    applications: countByJob.get(j.id) ?? 0,
                    createdAt: j.createdAt,
                    employer: {
                        id: j.createdBy,
                        name: `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim(),
                        pushDevices: settings.push ? devices : 0,
                        pushEnabled: settings.push,
                        emailEnabled: settings.email && !!c?.email,
                        willBeNotified: settings.push && devices > 0
                            ? true
                            : settings.email && !!c?.email,
                        whyNot: settings.push && devices > 0
                            ? ''
                            : settings.email && c?.email
                                ? ''
                                : !settings.push
                                    ? 'employer turned push off'
                                    : 'employer has no FCM token saved',
                    },
                };
            }),
        };
    }
    async apply(body) {
        const jobId = Number(body.jobId);
        const applicantIds = [
            ...new Set((body.applicantIds || []).map(Number)),
        ].filter((n) => n > 0);
        if (!jobId)
            throw new common_1.BadRequestException('Send jobId');
        if (!applicantIds.length) {
            throw new common_1.BadRequestException('Tick at least one applicant');
        }
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'title', 'isActive', 'createdBy'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (!job.title.startsWith('[FCM TEST]') && !body.confirmReal) {
            throw new common_1.BadRequestException('This is not an [FCM TEST] job - the real employer would be notified. Send confirmReal=true to continue.');
        }
        const results = [];
        for (const applicantId of applicantIds) {
            try {
                const app = await this.jobApplicationService.apply({
                    jobId,
                    applicantId,
                });
                results.push({ applicantId, ok: true, applicationId: app.id });
            }
            catch (err) {
                results.push({
                    applicantId,
                    ok: false,
                    message: err?.response?.message ?? err?.message ?? 'failed',
                });
            }
        }
        return {
            applied: results.filter((r) => r.ok).length,
            results,
            timing: this.applicationNotifier.getTiming(),
            note: 'The employer notification is queued and sent after the delay (see Queue panel).',
        };
    }
    async queue(jobId) {
        const id = Number(jobId);
        if (!id)
            throw new common_1.BadRequestException('Send jobId');
        const rows = await this.queueRepo.find({
            where: { groupKey: `job_application:${id}` },
            order: { id: 'DESC' },
            take: 25,
        });
        const timing = this.applicationNotifier.getTiming();
        const pending = rows.filter((r) => r.status === 'pending');
        const lastSent = rows.find((r) => r.status === 'sent');
        let estimatedSendAt = null;
        if (pending.length) {
            const first = Math.min(...pending.map((r) => new Date(r.queuedAt).getTime()));
            let at = first + timing.delaySeconds * 1000;
            if (lastSent?.processedAt && timing.minGapSeconds > 0) {
                at = Math.max(at, new Date(lastSent.processedAt).getTime() +
                    timing.minGapSeconds * 1000);
            }
            estimatedSendAt = new Date(at);
        }
        return {
            now: new Date(),
            timing,
            pendingCount: pending.length,
            estimatedSendAt,
            rows: rows.map((r) => ({
                id: r.id,
                status: r.status,
                applicant: r.payload?.applicantName ?? '',
                queuedAt: r.queuedAt,
                processedAt: r.processedAt,
                attempts: r.attempts,
                note: r.note ?? r.lastError ?? '',
            })),
        };
    }
    async jobActive(body) {
        const jobId = Number(body.jobId);
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'title'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (!job.title.startsWith('[FCM TEST]')) {
            throw new common_1.BadRequestException('Only [FCM TEST] jobs can be toggled here');
        }
        await this.jobRepo.update({ id: jobId }, { isActive: !!body.active });
        return { jobId, isActive: !!body.active };
    }
    async resetJob(body) {
        const jobId = Number(body.jobId);
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'title'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        if (!job.title.startsWith('[FCM TEST]')) {
            throw new common_1.BadRequestException('Only [FCM TEST] jobs can be reset here');
        }
        const apps = await this.appRepo.delete({ jobId });
        const queued = await this.queueRepo.delete({
            groupKey: `job_application:${jobId}`,
        });
        return {
            jobId,
            applicationsDeleted: apps.affected,
            queueRowsDeleted: queued.affected,
        };
    }
    async testPush(body) {
        let tokens = [];
        if (body.token) {
            tokens = [String(body.token).trim()];
        }
        else if (body.userId) {
            const user = await this.userRepo.findOne({
                where: { id: Number(body.userId) },
                select: ['id', 'fcmTokens'],
            });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            tokens = (user.fcmTokens || []).filter(Boolean);
            if (!tokens.length) {
                throw new common_1.BadRequestException('This user has NO fcm token saved. The app must send `fcmToken` on login/register.');
            }
        }
        else {
            throw new common_1.BadRequestException('Send userId or token');
        }
        const results = await this.firebaseService.sendDetailed(tokens, {
            title: 'FCM lab test',
            body: `Test push sent at ${new Date().toLocaleTimeString()}`,
        }, { type: 'fcm_lab_test' });
        return { sent: tokens.length, results };
    }
    async explain(body) {
        const filterIds = (body.filterIds || []).map(Number).filter((n) => n > 0);
        if (!filterIds.length)
            throw new common_1.BadRequestException('Send filterIds');
        return this.notificationService.explainRecipients(filterIds, Number(body.creatorId) || 0);
    }
    async createJob(body) {
        const creatorId = Number(body.creatorId);
        const filterIds = (body.filterIds || []).map(Number).filter((n) => n > 0);
        const onlyUserIds = (body.onlyUserIds || [])
            .map(Number)
            .filter((n) => n > 0);
        if (!creatorId)
            throw new common_1.BadRequestException('Send creatorId');
        if (!filterIds.length)
            throw new common_1.BadRequestException('Send filterIds');
        if (!onlyUserIds.length && !body.notifyAllMatching) {
            throw new common_1.BadRequestException('Pick recipients (onlyUserIds) or set notifyAllMatching=true (notifies REAL users)');
        }
        const job = await this.jobService.createJob({
            title: body.title?.trim() || `[FCM TEST] ${new Date().toISOString()}`,
            description: 'Created by the FCM lab to test push notifications',
            filterIds,
            isRemote: true,
            salaryType: 'daily-wage',
            salaryAmount: 1000,
            currency: 'PKR',
        }, creatorId, { skipNotification: true });
        const notification = await this.notificationService.notifyJobCreated(job, {
            onlyUserIds: body.notifyAllMatching ? undefined : onlyUserIds,
        });
        let deactivated = false;
        if (body.deactivate !== false) {
            await this.jobService.updateJob(job.id, { isActive: false }, creatorId);
            deactivated = true;
        }
        return {
            job: { id: job.id, title: job.title, filterIds: job.filterIds },
            deactivated,
            notification: notification ??
                'No notification summary (job had no filters or no recipients)',
            path: this.notificationService.buildJobPath(job.id),
        };
    }
};
exports.FcmLabController = FcmLabController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('jobs'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "jobs", null);
__decorate([
    (0, common_1.Post)('apply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Query)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "queue", null);
__decorate([
    (0, common_1.Post)('job-active'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "jobActive", null);
__decorate([
    (0, common_1.Post)('reset-job'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "resetJob", null);
__decorate([
    (0, common_1.Post)('test-push'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "testPush", null);
__decorate([
    (0, common_1.Post)('explain'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "explain", null);
__decorate([
    (0, common_1.Post)('create-job'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FcmLabController.prototype, "createJob", null);
exports.FcmLabController = FcmLabController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.UseGuards)(DebugLabGuard),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }),
    (0, common_1.Controller)('debug/fcm'),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(2, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(3, (0, typeorm_1.InjectRepository)(notification_queue_entity_1.NotificationQueueItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        job_application_service_1.JobApplicationService,
        application_notifier_1.ApplicationNotifier,
        firebase_service_1.FirebaseService,
        notification_service_1.NotificationService,
        mail_service_1.MailService,
        job_service_1.JobService])
], FcmLabController);
//# sourceMappingURL=fcm-lab.controller.js.map