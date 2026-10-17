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
var NotificationQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationQueueService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const notification_queue_entity_1 = require("./notification-queue.entity");
const MAX_ATTEMPTS = 3;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const KEEP_PROCESSED_MS = 7 * 24 * 60 * 60 * 1000;
let NotificationQueueService = NotificationQueueService_1 = class NotificationQueueService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(NotificationQueueService_1.name);
        this.registrations = new Map();
        this.timer = null;
        this.running = false;
        this.lastCleanup = 0;
    }
    register(type, registration) {
        this.registrations.set(type, registration);
    }
    async enqueue(item) {
        await this.repo.insert({
            type: item.type,
            groupKey: item.groupKey,
            recipientId: item.recipientId,
            payload: item.payload ?? null,
            status: 'pending',
            queuedAt: new Date(),
        });
    }
    onModuleInit() {
        if (process.env.NOTIFICATION_WORKER === 'off') {
            this.logger.warn('Notification worker is OFF on this instance');
            return;
        }
        const pollMs = Math.max(1, Number(process.env.NOTIFICATION_QUEUE_POLL_SECONDS) || 5) *
            1000;
        this.timer = setInterval(() => void this.tick(), pollMs);
        this.timer.unref?.();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            await this.releaseStuckClaims();
            for (const [type, reg] of this.registrations) {
                await this.processType(type, reg);
            }
            await this.cleanupOld();
        }
        catch (err) {
            this.logger.error(`Queue tick failed: ${err?.message}`, err?.stack);
        }
        finally {
            this.running = false;
        }
    }
    async processType(type, reg) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - reg.delaySeconds * 1000);
        const groups = await this.repo
            .createQueryBuilder('q')
            .select('q.groupKey', 'groupKey')
            .where('q.type = :type AND q.status = :status', {
            type,
            status: 'pending',
        })
            .andWhere('(q.notBefore IS NULL OR q.notBefore <= :now)', { now })
            .groupBy('q.groupKey')
            .having('MIN(q.queuedAt) <= :cutoff', { cutoff })
            .limit(50)
            .getRawMany();
        for (const { groupKey } of groups) {
            if (await this.withinGap(groupKey, reg.minGapSeconds, now))
                continue;
            await this.processGroup(type, groupKey, reg);
        }
    }
    async withinGap(groupKey, gapSeconds, now) {
        if (gapSeconds <= 0)
            return false;
        const row = await this.repo
            .createQueryBuilder('q')
            .select('MAX(q.processedAt)', 'last')
            .where('q.groupKey = :groupKey AND q.status = :status', {
            groupKey,
            status: 'sent',
        })
            .getRawOne();
        if (!row?.last)
            return false;
        return now.getTime() - new Date(row.last).getTime() < gapSeconds * 1000;
    }
    async processGroup(type, groupKey, reg) {
        const now = new Date();
        const token = (0, crypto_1.randomUUID)();
        const claim = await this.repo
            .createQueryBuilder()
            .update(notification_queue_entity_1.NotificationQueueItem)
            .set({ status: 'claimed', claimToken: token, claimedAt: now })
            .where('type = :type AND groupKey = :groupKey AND status = :pending', {
            type,
            groupKey,
            pending: 'pending',
        })
            .andWhere('queuedAt <= :now', { now })
            .andWhere('(notBefore IS NULL OR notBefore <= :now)', { now })
            .execute();
        if (!claim.affected)
            return;
        const items = await this.repo.find({
            where: { claimToken: token },
            order: { id: 'ASC' },
        });
        try {
            const raw = await reg.handler(items);
            const result = typeof raw === 'string' ? { status: raw } : raw;
            await this.repo.update({ claimToken: token }, {
                status: result.status,
                note: (result.note ?? '').slice(0, 250) || null,
                processedAt: new Date(),
            });
            this.logger.log(`${groupKey}: ${items.length} item(s) -> ${result.status.toUpperCase()}${result.note ? ` (${result.note})` : ''}`);
        }
        catch (err) {
            const message = String(err?.message ?? err).slice(0, 250);
            this.logger.error(`${groupKey}: handler failed - ${message}`);
            for (const item of items) {
                const attempts = item.attempts + 1;
                if (attempts >= MAX_ATTEMPTS) {
                    await this.repo.update(item.id, {
                        status: 'failed',
                        attempts,
                        lastError: message,
                        processedAt: new Date(),
                    });
                }
                else {
                    await this.repo.update(item.id, {
                        status: 'pending',
                        claimToken: null,
                        claimedAt: null,
                        attempts,
                        lastError: message,
                        notBefore: new Date(Date.now() + attempts * 30 * 1000),
                    });
                }
            }
        }
    }
    async releaseStuckClaims() {
        await this.repo.update({
            status: 'claimed',
            claimedAt: (0, typeorm_2.LessThan)(new Date(Date.now() - CLAIM_TIMEOUT_MS)),
        }, { status: 'pending', claimToken: null, claimedAt: null });
    }
    async cleanupOld() {
        if (Date.now() - this.lastCleanup < 60 * 60 * 1000)
            return;
        this.lastCleanup = Date.now();
        await this.repo.delete({
            processedAt: (0, typeorm_2.LessThan)(new Date(Date.now() - KEEP_PROCESSED_MS)),
        });
    }
};
exports.NotificationQueueService = NotificationQueueService;
exports.NotificationQueueService = NotificationQueueService = NotificationQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_queue_entity_1.NotificationQueueItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationQueueService);
//# sourceMappingURL=notification-queue.service.js.map