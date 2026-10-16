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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const filter_entity_1 = require("../filter/entities/filter.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const mail_service_1 = require("./mail.service");
const notification_settings_1 = require("./notification-settings");
const USER_BATCH = 500;
const EMAIL_CONCURRENCY = 10;
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(userRepo, firebaseService, mailService) {
        this.userRepo = userRepo;
        this.firebaseService = firebaseService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(NotificationService_1.name);
        this.recent = new Map();
    }
    getSummary(jobId) {
        return this.recent.get(jobId);
    }
    async notifyJobCreated(job, opts = {}) {
        try {
            const filters = job.filters || [];
            if (!filters.length || job.isActive === false)
                return;
            const groups = await this.collectRecipients(job, filters, opts.onlyUserIds);
            let pushUsers = 0;
            let pushOk = 0;
            let pushFailed = 0;
            const pushErrors = {};
            let emailSent = 0;
            let emailSkipped = 0;
            let emailFailed = 0;
            for (const group of groups.values()) {
                const message = this.buildJobMessage(job, group.matched);
                if (group.pushTokens.length) {
                    pushUsers += group.pushTokens.length;
                    try {
                        const res = await this.firebaseService.sendToTokens(group.pushTokens, { title: message.title, body: message.body }, message.data);
                        pushOk += res.success;
                        pushFailed += res.failure;
                        for (const [code, e] of Object.entries(res.errors)) {
                            pushErrors[code] = pushErrors[code] || { count: 0, hint: e.hint };
                            pushErrors[code].count += e.count;
                        }
                    }
                    catch (err) {
                        pushFailed += group.pushTokens.length;
                        const code = err?.code || 'send-exception';
                        pushErrors[code] = pushErrors[code] || {
                            count: 0,
                            hint: this.firebaseService.hintForError(code) ||
                                err?.message ||
                                '',
                        };
                        pushErrors[code].count += group.pushTokens.length;
                        this.logger.error(`Job #${job.id}: push send failed — ${err?.message}`);
                    }
                }
                for (let i = 0; i < group.emails.length; i += EMAIL_CONCURRENCY) {
                    const results = await Promise.allSettled(group.emails.slice(i, i + EMAIL_CONCURRENCY).map((to) => this.mailService.send({
                        to,
                        ...this.buildJobEmail(job, message),
                    })));
                    for (const r of results) {
                        if (r.status === 'rejected')
                            emailFailed++;
                        else if (r.value)
                            emailSent++;
                        else
                            emailSkipped++;
                    }
                }
            }
            const errorText = Object.entries(pushErrors)
                .map(([code, e]) => `${code}x${e.count}`)
                .join(', ');
            this.logger.log(`Job #${job.id} notified - ${groups.size} group(s); push: ${pushUsers} device(s) (${pushOk} ok, ${pushFailed} failed${errorText ? `: ${errorText}` : ''}); ` +
                `email: ${emailSent} sent, ${emailSkipped} skipped (SMTP off), ${emailFailed} failed`);
            const summary = {
                jobId: job.id,
                at: new Date().toISOString(),
                recipientsFound: [...groups.values()].reduce((n, g) => n + Math.max(g.pushTokens.length, g.emails.length), 0),
                groups: [...groups.values()].map((g) => ({
                    filters: g.matched.map((f) => f.name),
                    pushDevices: g.pushTokens.length,
                    emails: g.emails.length,
                })),
                push: {
                    devices: pushUsers,
                    success: pushOk,
                    failure: pushFailed,
                    errors: pushErrors,
                },
                email: { sent: emailSent, skipped: emailSkipped, failed: emailFailed },
            };
            this.recent.set(job.id, summary);
            if (this.recent.size > 50) {
                this.recent.delete(this.recent.keys().next().value);
            }
            return summary;
        }
        catch (err) {
            this.logger.error(`Job #${job.id}: notification failed - ${err?.message}`, err?.stack);
        }
    }
    async explainRecipients(filterIds, creatorId, limit = 500) {
        const users = await this.userRepo.find({
            select: [
                'id',
                'firstName',
                'lastName',
                'email',
                'isBanned',
                'fcmTokens',
                'filter_preferences',
                'notification_settings',
            ],
            order: { id: 'ASC' },
            take: limit,
        });
        return users.map((u) => {
            const reasons = [];
            const prefs = new Set((u.filter_preferences || []).map(Number));
            const matchedFilterIds = filterIds.filter((id) => prefs.has(id));
            const settings = (0, notification_settings_1.resolveNotificationSettings)(u.notification_settings);
            const devices = (u.fcmTokens || []).filter(Boolean).length;
            const emailOn = settings.email && !!u.email;
            if (u.id === creatorId)
                reasons.push('is the job creator (never notified)');
            if (u.isBanned)
                reasons.push('user is banned');
            if (!matchedFilterIds.length)
                reasons.push('none of the job filters are in filter_preferences');
            if (!settings.push && !emailOn)
                reasons.push('push (and email) disabled in notification settings');
            else if (settings.push && !devices && !emailOn)
                reasons.push('push enabled but NO fcm token saved (app never sent fcmToken on login)');
            const willNotify = reasons.length === 0;
            return {
                userId: u.id,
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
                willNotify,
                reasons: willNotify
                    ? [
                        [
                            settings.push && devices ? `push to ${devices} device(s)` : '',
                            emailOn ? 'email' : '',
                        ]
                            .filter(Boolean)
                            .join(' + '),
                    ]
                    : reasons,
                matchedFilterIds,
                pushDevices: settings.push ? devices : 0,
            };
        });
    }
    async collectRecipients(job, filters, onlyUserIds) {
        const groups = new Map();
        const filterIds = filters.map((f) => f.id);
        let lastId = 0;
        for (;;) {
            const users = await this.userRepo
                .createQueryBuilder('u')
                .select([
                'u.id',
                'u.email',
                'u.fcmTokens',
                'u.filter_preferences',
                'u.notification_settings',
            ])
                .where('u.id > :lastId', { lastId })
                .andWhere('u.id != :creatorId', { creatorId: job.createdBy })
                .andWhere('u.isBanned = false')
                .andWhere(onlyUserIds?.length ? 'u.id IN (:...onlyIds)' : '1 = 1', {
                onlyIds: onlyUserIds?.length ? onlyUserIds : [0],
            })
                .andWhere(new typeorm_2.Brackets((qb) => {
                filterIds.forEach((id, i) => qb.orWhere(`FIND_IN_SET(:fid${i}, u.filter_preferences) > 0`, {
                    [`fid${i}`]: id,
                }));
            }))
                .orderBy('u.id', 'ASC')
                .take(USER_BATCH)
                .getMany();
            if (!users.length)
                break;
            lastId = users[users.length - 1].id;
            for (const user of users) {
                const prefs = new Set((user.filter_preferences || []).map(Number));
                const matched = filters.filter((f) => prefs.has(f.id));
                if (!matched.length)
                    continue;
                const settings = (0, notification_settings_1.resolveNotificationSettings)(user.notification_settings);
                const tokens = settings.push
                    ? (user.fcmTokens || []).filter(Boolean)
                    : [];
                const email = settings.email && user.email ? String(user.email).trim() : '';
                if (!tokens.length && !email)
                    continue;
                const key = matched
                    .map((f) => f.id)
                    .sort((a, b) => a - b)
                    .join(',');
                let group = groups.get(key);
                if (!group) {
                    group = { matched, pushTokens: [], emails: [] };
                    groups.set(key, group);
                }
                group.pushTokens.push(...tokens);
                if (email)
                    group.emails.push(email);
            }
            if (users.length < USER_BATCH)
                break;
        }
        return groups;
    }
    buildJobPath(jobId) {
        const template = process.env.NOTIFICATION_JOB_PATH || '/job/{id}';
        return template.replace('{id}', String(jobId));
    }
    slimIcon(icon) {
        const normalized = (0, filter_entity_1.normalizeFilterIcon)(icon);
        return normalized.type === 'tabler'
            ? { type: 'tabler', name: normalized.name }
            : { type: 'custom' };
    }
    buildJobMessage(job, matched) {
        const names = matched.map((f) => f.name);
        const body = `Job created in ${names.join(', ')} ${names.length > 1 ? 'filters' : 'filter'}`;
        const title = `New job: ${job.title}`;
        const createdAt = (job.createdAt ? new Date(job.createdAt) : new Date()).toISOString();
        const data = {
            type: 'job_created',
            jobId: String(job.id),
            title: job.title,
            text: body,
            createdAt,
            filterIds: matched.map((f) => f.id).join(','),
            filterIcon: JSON.stringify(this.slimIcon(matched[0].icon)),
            filters: JSON.stringify(matched.map((f) => ({
                id: f.id,
                name: f.name,
                icon: this.slimIcon(f.icon),
            }))),
            isRemote: String(!!job.isRemote),
            salaryType: job.salaryType ?? '',
            salaryAmount: job.salaryAmount != null ? String(job.salaryAmount) : '',
            currency: job.currency ?? '',
            companyName: job.page?.company_name ?? '',
            pageId: job.pageId != null ? String(job.pageId) : '',
            path: this.buildJobPath(job.id),
        };
        return { title, body, names, data };
    }
    buildJobEmail(job, message) {
        const salary = job.salaryAmount != null
            ? `${job.salaryAmount} ${job.currency ?? ''} (${job.salaryType})`.trim()
            : '';
        const company = job.page?.company_name ?? '';
        const lines = [message.body, '', `Job: ${job.title}`];
        if (company)
            lines.push(`Company: ${company}`);
        if (salary)
            lines.push(`Salary: ${salary}`);
        if (job.isRemote)
            lines.push('Remote job');
        lines.push('', 'Open the JobsLoot app to view and apply.', '', 'You can turn off email notifications anytime in the app settings.');
        const esc = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 8px">${esc(message.title)}</h2>
<p style="margin:0 0 12px;color:#444">${esc(message.body)}</p>
<ul style="padding-left:18px;color:#222">
<li><b>Job:</b> ${esc(job.title)}</li>
${company ? `<li><b>Company:</b> ${esc(company)}</li>` : ''}
${salary ? `<li><b>Salary:</b> ${esc(salary)}</li>` : ''}
${job.isRemote ? '<li>Remote job</li>' : ''}
</ul>
<p>Open the JobsLoot app to view and apply.</p>
<p style="color:#888;font-size:12px">You can turn off email notifications anytime in the app settings.</p>
</div>`;
        return { subject: message.title, text: lines.join('\n'), html };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        firebase_service_1.FirebaseService,
        mail_service_1.MailService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map