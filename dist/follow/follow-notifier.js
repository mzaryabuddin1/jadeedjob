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
var FollowNotifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowNotifier = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const follow_entity_1 = require("./follow.entity");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const notification_queue_service_1 = require("../notification/notification-queue.service");
const notification_service_1 = require("../notification/notification.service");
const num = (v, fallback) => v !== undefined && v !== '' && !Number.isNaN(Number(v))
    ? Number(v)
    : fallback;
let FollowNotifier = FollowNotifier_1 = class FollowNotifier {
    constructor(queue, notifications, followRepo, userRepo, pageRepo) {
        this.queue = queue;
        this.notifications = notifications;
        this.followRepo = followRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.logger = new common_1.Logger(FollowNotifier_1.name);
    }
    onModuleInit() {
        this.queue.register('follow', {
            delaySeconds: num(process.env.FOLLOW_NOTIFY_DELAY_SECONDS, 60),
            minGapSeconds: num(process.env.FOLLOW_NOTIFY_MIN_GAP_SECONDS, 120),
            handler: (items) => this.flush(items),
        });
    }
    async onFollow(actorId, type, targetId) {
        try {
            let recipientId = targetId;
            if (type === 'page') {
                const page = await this.pageRepo.findOne({
                    where: { id: targetId },
                    select: ['id', 'ownerId'],
                });
                if (!page)
                    return;
                recipientId = page.ownerId;
            }
            if (recipientId === actorId)
                return;
            await this.queue.enqueue({
                type: 'follow',
                groupKey: `follow:${type}:${targetId}`,
                recipientId,
                payload: { actorId, targetType: type, targetId },
            });
        }
        catch (err) {
            this.logger.error(`Could not queue follow notification: ${err?.message}`);
        }
    }
    async flush(items) {
        const { targetType, targetId } = items[0].payload;
        const actorIds = [
            ...new Set(items.map((i) => i.payload.actorId)),
        ];
        const still = await this.followRepo.find({
            where: { targetType, targetId, followerId: (0, typeorm_2.In)(actorIds) },
            order: { id: 'DESC' },
        });
        if (!still.length)
            return { status: 'skipped', note: 'all follows were undone' };
        const users = await this.userRepo.find({
            where: { id: (0, typeorm_2.In)(still.map((f) => f.followerId)) },
            select: ['id', 'firstName', 'lastName'],
        });
        const name = (id) => {
            const u = users.find((x) => x.id === id);
            return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Someone';
        };
        let subject = 'you';
        let path = (process.env.NOTIFICATION_PROFILE_PATH || '/user/{id}').replace('{id}', String(targetId));
        if (targetType === 'page') {
            const page = await this.pageRepo.findOne({
                where: { id: targetId },
                select: ['id', 'page_name'],
            });
            subject = `"${page?.page_name ?? 'your page'}"`;
            path = (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace('{id}', String(targetId));
        }
        const others = still.length - 1;
        const body = others === 0
            ? `${name(still[0].followerId)} started following ${subject}`
            : `${name(still[0].followerId)} and ${others} other${others > 1 ? 's' : ''} started following ${subject}`;
        const res = await this.notifications.notifyUser(items[0].recipientId, {
            title: 'New followers',
            body,
            data: {
                type: 'new_follower',
                targetType,
                targetId,
                count: still.length,
                path,
            },
        });
        return {
            status: 'sent',
            note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
        };
    }
};
exports.FollowNotifier = FollowNotifier;
exports.FollowNotifier = FollowNotifier = FollowNotifier_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(follow_entity_1.Follow)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [notification_queue_service_1.NotificationQueueService,
        notification_service_1.NotificationService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], FollowNotifier);
//# sourceMappingURL=follow-notifier.js.map