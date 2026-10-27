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
var NotificationInbox_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationInbox = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./notification.entity");
const chat_events_service_1 = require("../chat/chat-events.service");
const DUPLICATED_KEYS = new Set(['title', 'text', 'createdAt', 'type']);
const KEEP_DAYS = Math.max(1, Number(process.env.NOTIFICATION_KEEP_DAYS) || 90);
const BULK_CHUNK = 500;
let NotificationInbox = NotificationInbox_1 = class NotificationInbox {
    constructor(repo, events) {
        this.repo = repo;
        this.events = events;
        this.logger = new common_1.Logger(NotificationInbox_1.name);
        this.timer = null;
    }
    onModuleInit() {
        if (process.env.NOTIFICATION_WORKER === 'off')
            return;
        this.timer = setInterval(() => void this.purge(), 6 * 60 * 60 * 1000);
        this.timer.unref?.();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async purge() {
        try {
            const before = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
            await this.repo.delete({ createdAt: (0, typeorm_2.LessThan)(before) });
        }
        catch (err) {
            this.logger.error(`Purge failed: ${err?.message}`);
        }
    }
    async add(userId, message) {
        try {
            const row = await this.repo.save(this.repo.create({ userId, ...this.values(message) }));
            this.events.emitToUsers([userId], 'notification:new', {
                notification: this.view(row),
            });
            return row;
        }
        catch (err) {
            this.logger.error(`Could not store notification for #${userId}: ${err?.message}`);
        }
    }
    async addMany(userIds, message) {
        const ids = [...new Set(userIds)];
        if (!ids.length)
            return;
        try {
            const values = this.values(message);
            for (let i = 0; i < ids.length; i += BULK_CHUNK) {
                const chunk = ids.slice(i, i + BULK_CHUNK);
                await this.repo.insert(chunk.map((userId) => ({ userId, ...values })));
                this.events.emitToUsers(chunk, 'notification:new', { notification: null });
            }
        }
        catch (err) {
            this.logger.error(`Could not store ${ids.length} notifications: ${err?.message}`);
        }
    }
    values(m) {
        const data = {};
        for (const [k, v] of Object.entries(m.data ?? {})) {
            if (DUPLICATED_KEYS.has(k) || v == null || v === '')
                continue;
            data[k] = String(v);
        }
        return {
            type: String(m.type ?? m.data?.type ?? 'general').slice(0, 40),
            title: m.title.slice(0, 255),
            body: m.body,
            data: Object.keys(data).length ? data : null,
        };
    }
    async list(userId, opts) {
        const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
        const qb = this.repo
            .createQueryBuilder('n')
            .where('n.userId = :userId', { userId })
            .orderBy('n.id', 'DESC')
            .take(limit + 1);
        if (opts.before)
            qb.andWhere('n.id < :before', { before: opts.before });
        if (opts.unreadOnly)
            qb.andWhere('n.readAt IS NULL');
        if (opts.type)
            qb.andWhere('n.type = :type', { type: opts.type });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        return {
            data: page.map((r) => this.view(r)),
            nextCursor: hasMore ? page[page.length - 1].id : null,
            hasMore,
            unreadCount: await this.unreadCount(userId),
        };
    }
    unreadCount(userId) {
        return this.repo.count({ where: { userId, readAt: (0, typeorm_2.IsNull)() } });
    }
    async markRead(userId, id) {
        const row = await this.own(userId, id);
        if (!row.readAt) {
            row.readAt = new Date();
            await this.repo.update(row.id, { readAt: row.readAt });
            this.events.emitToUsers([userId], 'notification:read', { ids: [id] });
        }
        return { ...this.view(row), unreadCount: await this.unreadCount(userId) };
    }
    async markAllRead(userId, type) {
        const qb = this.repo
            .createQueryBuilder()
            .update(notification_entity_1.Notification)
            .set({ readAt: new Date() })
            .where('userId = :userId AND readAt IS NULL', { userId });
        if (type)
            qb.andWhere('type = :type', { type });
        const res = await qb.execute();
        this.events.emitToUsers([userId], 'notification:read', { all: true, type: type ?? null });
        return { updated: res.affected ?? 0, unreadCount: await this.unreadCount(userId) };
    }
    async remove(userId, id) {
        await this.own(userId, id);
        await this.repo.delete(id);
        return { message: 'Notification deleted', unreadCount: await this.unreadCount(userId) };
    }
    async clear(userId, onlyRead) {
        const res = await this.repo.delete(onlyRead ? { userId, readAt: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) } : { userId });
        return { deleted: res.affected ?? 0, unreadCount: await this.unreadCount(userId) };
    }
    async own(userId, id) {
        const row = await this.repo.findOne({ where: { id, userId } });
        if (!row)
            throw new common_1.NotFoundException('Notification not found');
        return row;
    }
    view(n) {
        return {
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            path: n.data?.path ?? null,
            data: n.data ?? {},
            read: !!n.readAt,
            readAt: n.readAt,
            createdAt: n.createdAt,
        };
    }
};
exports.NotificationInbox = NotificationInbox;
exports.NotificationInbox = NotificationInbox = NotificationInbox_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        chat_events_service_1.ChatEvents])
], NotificationInbox);
//# sourceMappingURL=notification-inbox.service.js.map