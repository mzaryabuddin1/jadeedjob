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
var ApplicationNotifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationNotifier = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const job_application_entity_1 = require("./entities/job-application.entity");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const mail_service_1 = require("../notification/mail.service");
const notification_queue_service_1 = require("../notification/notification-queue.service");
const notification_settings_1 = require("../notification/notification-settings");
const TYPE = 'job_application';
let ApplicationNotifier = ApplicationNotifier_1 = class ApplicationNotifier {
    constructor(queue, firebaseService, mailService, userRepo, jobRepo, appRepo, pageRepo) {
        this.queue = queue;
        this.firebaseService = firebaseService;
        this.mailService = mailService;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.appRepo = appRepo;
        this.pageRepo = pageRepo;
        this.logger = new common_1.Logger(ApplicationNotifier_1.name);
    }
    getTiming() {
        const num = (v, fallback) => v !== undefined && v !== '' && !Number.isNaN(Number(v))
            ? Number(v)
            : fallback;
        return {
            delaySeconds: num(process.env.APPLICATION_NOTIFY_DELAY_SECONDS, 30),
            minGapSeconds: num(process.env.APPLICATION_NOTIFY_MIN_GAP_SECONDS, 120),
        };
    }
    onModuleInit() {
        this.queue.register(TYPE, {
            ...this.getTiming(),
            handler: (items) => this.flush(items),
        });
    }
    async onApplied(job, application) {
        try {
            const applicant = await this.userRepo.findOne({
                where: { id: application.applicantId },
                select: ['id', 'firstName', 'lastName'],
            });
            const applicantName = `${applicant?.firstName ?? ''} ${applicant?.lastName ?? ''}`.trim() ||
                'Someone';
            await this.queue.enqueue({
                type: TYPE,
                groupKey: `${TYPE}:${job.id}`,
                recipientId: job.createdBy,
                payload: {
                    applicationId: application.id,
                    applicantId: application.applicantId,
                    applicantName,
                    jobId: job.id,
                },
            });
        }
        catch (err) {
            this.logger.error(`Could not queue notification for application #${application?.id}: ${err?.message}`);
        }
    }
    async notifyAccepted(application, job) {
        try {
            const applicant = await this.userRepo.findOne({
                where: { id: application.applicantId },
                select: [
                    'id',
                    'email',
                    'fcmTokens',
                    'notification_settings',
                    'isBanned',
                ],
            });
            if (!applicant || applicant.isBanned)
                return;
            const settings = (0, notification_settings_1.resolveNotificationSettings)(applicant.notification_settings);
            const tokens = settings.push
                ? (applicant.fcmTokens || []).filter(Boolean)
                : [];
            const email = settings.email && applicant.email ? String(applicant.email).trim() : '';
            if (!tokens.length && !email) {
                this.logger.log(`Application #${application.id} accepted - applicant #${applicant.id} has no push token / email enabled, nothing sent`);
                return;
            }
            const company = job.pageId
                ? ((await this.pageRepo.findOne({
                    where: { id: job.pageId },
                    select: ['id', 'company_name'],
                }))?.company_name ?? '')
                : '';
            const title = 'Application accepted';
            const body = `Your application for "${job.title}" was accepted${company ? ` by ${company}` : ''}`;
            const template = process.env.NOTIFICATION_APPLICATION_ACCEPTED_PATH ||
                '/application/{id}';
            const data = {
                type: 'application_accepted',
                applicationId: String(application.id),
                jobId: String(job.id),
                jobTitle: job.title,
                title,
                text: body,
                companyName: company,
                pageId: job.pageId != null ? String(job.pageId) : '',
                createdAt: new Date().toISOString(),
                path: template.replace('{id}', String(application.id)),
            };
            this.logger.log(`Application #${application.id} accepted -> applicant #${applicant.id}: "${body}"`);
            if (tokens.length) {
                const res = await this.firebaseService.sendToTokens(tokens, { title, body }, data);
                const errors = Object.entries(res.errors)
                    .map(([code, e]) => `${code}x${e.count}`)
                    .join(', ');
                this.logger.log(`Application #${application.id} accepted push: ${res.success} ok, ${res.failure} failed${errors ? ` (${errors})` : ''}`);
            }
            if (email) {
                await this.mailService.send({
                    to: email,
                    subject: body,
                    text: `${body}\n\nOpen the JobsLoot app to see the details.\n\nYou can turn off email notifications anytime in the app settings.`,
                });
            }
        }
        catch (err) {
            this.logger.error(`Could not notify applicant for application #${application?.id}: ${err?.message}`);
        }
    }
    buildPath(jobId) {
        const template = process.env.NOTIFICATION_APPLICATION_PATH || '/job/{id}/applications';
        return template.replace('{id}', String(jobId));
    }
    async flush(items) {
        const payloads = items.map((i) => i.payload);
        const jobId = payloads[0].jobId;
        const employerId = items[0].recipientId;
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'title', 'isActive', 'createdBy'],
        });
        if (!job || job.isActive === false) {
            return { status: 'skipped', note: 'job is missing or inactive' };
        }
        const employer = await this.userRepo.findOne({
            where: { id: employerId },
            select: ['id', 'email', 'fcmTokens', 'notification_settings', 'isBanned'],
        });
        if (!employer || employer.isBanned) {
            return { status: 'skipped', note: 'employer missing or banned' };
        }
        const settings = (0, notification_settings_1.resolveNotificationSettings)(employer.notification_settings);
        const tokens = settings.push
            ? (employer.fcmTokens || []).filter(Boolean)
            : [];
        const email = settings.email && employer.email ? String(employer.email).trim() : '';
        if (!tokens.length && !email) {
            return {
                status: 'skipped',
                note: !settings.push && !settings.email
                    ? 'employer turned off push and email'
                    : 'employer has no FCM token saved (and email is off)',
            };
        }
        const count = payloads.length;
        const total = await this.appRepo.count({ where: { jobId } });
        const names = [...new Set(payloads.map((p) => p.applicantName))];
        const title = count === 1 ? 'New applicant' : 'New applicants';
        let body = count === 1
            ? `${names[0]} applied to your job "${job.title}"`
            : `${count} people applied to your job "${job.title}"`;
        if (total > count)
            body += ` (${total} total)`;
        const data = {
            type: 'job_application',
            jobId: String(jobId),
            jobTitle: job.title,
            title,
            text: body,
            count: String(count),
            totalApplications: String(total),
            applicantIds: payloads
                .slice(0, 10)
                .map((p) => p.applicantId)
                .join(','),
            applicantNames: JSON.stringify(names.slice(0, 3)),
            applicationId: count === 1 ? String(payloads[0].applicationId) : '',
            createdAt: new Date().toISOString(),
            path: this.buildPath(jobId),
        };
        this.logger.log(`Job #${jobId} -> employer #${employerId}: "${body}"`);
        const notes = [`"${body}"`];
        if (tokens.length) {
            const res = await this.firebaseService.sendToTokens(tokens, { title, body }, data);
            const errors = Object.entries(res.errors)
                .map(([code, e]) => `${code}x${e.count}`)
                .join(', ');
            const pushText = `push: ${res.success} ok, ${res.failure} failed${errors ? ` (${errors})` : ''}`;
            this.logger.log(`Job #${jobId} ${pushText}`);
            notes.push(pushText);
        }
        if (email) {
            const esc = (s) => s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            await this.mailService.send({
                to: email,
                subject: body,
                text: `${body}\n\nOpen the JobsLoot app to review the applications.\n\nYou can turn off email notifications anytime in the app settings.`,
                html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 8px">${esc(title)}</h2><p>${esc(body)}</p><p>Open the JobsLoot app to review the applications.</p><p style="color:#888;font-size:12px">You can turn off email notifications anytime in the app settings.</p></div>`,
            });
        }
        if (email)
            notes.push('email sent');
        return { status: 'sent', note: notes.join(' | ') };
    }
};
exports.ApplicationNotifier = ApplicationNotifier;
exports.ApplicationNotifier = ApplicationNotifier = ApplicationNotifier_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(5, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(6, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [notification_queue_service_1.NotificationQueueService,
        firebase_service_1.FirebaseService,
        mail_service_1.MailService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ApplicationNotifier);
//# sourceMappingURL=application-notifier.js.map