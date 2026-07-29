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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const push_service_1 = require("../push/push.service");
let NotificationsService = class NotificationsService {
    constructor(notificationRepo, userRepo, pushService) {
        this.notificationRepo = notificationRepo;
        this.userRepo = userRepo;
        this.pushService = pushService;
    }
    format(notification) {
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            receivedAt: notification.createdAt,
            unread: !notification.readAt,
            data: notification.data || {},
        };
    }
    async create(input) {
        const notification = await this.notificationRepo.save(this.notificationRepo.create({
            ...input,
            data: input.data || {},
        }));
        await this.pushService
            .sendToUser(input.userId, this.categoryForType(input.type), input.title, input.message, input.data || {})
            .catch((error) => console.error('Push delivery failed', {
            userId: input.userId,
            type: input.type,
            error: error.message,
        }));
        return this.format(notification);
    }
    async createMany(inputs) {
        if (!inputs.length)
            return [];
        const notifications = await this.notificationRepo.save(inputs.map((input) => this.notificationRepo.create({
            ...input,
            data: input.data || {},
        })));
        await Promise.all(inputs.map((input) => this.pushService
            .sendToUser(input.userId, this.categoryForType(input.type), input.title, input.message, input.data || {})
            .catch(() => undefined)));
        return notifications.map((notification) => this.format(notification));
    }
    async createForFilterSubscribers(filterId, title, message, data, excludeUserId) {
        const users = await this.userRepo.find({
            select: ['id', 'filter_preferences'],
        });
        const notifications = users
            .filter((user) => user.id !== excludeUserId)
            .filter((user) => {
            const preferences = Array.isArray(user.filter_preferences)
                ? user.filter_preferences
                : [];
            return preferences.map(Number).includes(Number(filterId));
        })
            .map((user) => ({
            userId: user.id,
            type: 'job_match',
            title,
            message,
            data,
        }));
        return this.createMany(notifications);
    }
    async list(userId, page = 1, limit = 20) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [notifications, total] = await this.notificationRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (currentPage - 1) * take,
            take,
        });
        return {
            data: notifications.map((notification) => this.format(notification)),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async unreadCount(userId) {
        const count = await this.notificationRepo.count({
            where: { userId, readAt: (0, typeorm_2.IsNull)() },
        });
        return { count };
    }
    async markRead(userId, id) {
        const notification = await this.notificationRepo.findOne({
            where: { id },
        });
        if (!notification)
            throw new common_1.NotFoundException('Notification not found');
        if (notification.userId !== userId) {
            throw new common_1.ForbiddenException('You cannot update this notification');
        }
        if (!notification.readAt) {
            notification.readAt = new Date();
            await this.notificationRepo.save(notification);
        }
        return this.format(notification);
    }
    async markAllRead(userId) {
        await this.notificationRepo.update({ userId, readAt: (0, typeorm_2.IsNull)() }, { readAt: new Date() });
        return { message: 'Notifications marked as read' };
    }
    categoryForType(type) {
        if (type.includes('chat') || type.includes('message'))
            return 'messages';
        if (type.includes('application'))
            return 'applications';
        if (type.includes('job'))
            return 'jobs';
        if (type.includes('support'))
            return 'support';
        if (type.includes('company') || type.includes('access'))
            return 'company';
        if (type.includes('reel') || type.includes('video'))
            return 'videos';
        if (type.includes('security') || type.includes('password'))
            return 'security';
        return 'community';
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        push_service_1.PushService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map