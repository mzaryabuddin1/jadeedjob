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
    constructor(userRepo, firebaseService, notificationService, mailService, jobService) {
        this.userRepo = userRepo;
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
    __metadata("design:paramtypes", [typeorm_2.Repository,
        firebase_service_1.FirebaseService,
        notification_service_1.NotificationService,
        mail_service_1.MailService,
        job_service_1.JobService])
], FcmLabController);
//# sourceMappingURL=fcm-lab.controller.js.map