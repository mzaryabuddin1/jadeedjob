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
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const firebase_service_1 = require("../firebase/firebase.service");
const notification_preference_entity_1 = require("./entities/notification-preference.entity");
const push_device_entity_1 = require("./entities/push-device.entity");
const realtime_presence_service_1 = require("../realtime/realtime-presence.service");
let PushService = class PushService {
    constructor(deviceRepo, preferenceRepo, firebaseService, presenceService) {
        this.deviceRepo = deviceRepo;
        this.preferenceRepo = preferenceRepo;
        this.firebaseService = firebaseService;
        this.presenceService = presenceService;
    }
    async upsertDevice(userId, input) {
        const saved = await this.deviceRepo.manager.transaction(async (manager) => {
            await manager
                .getRepository(push_device_entity_1.PushDevice)
                .createQueryBuilder()
                .delete()
                .where('token = :token', { token: input.token })
                .andWhere('(userId != :userId OR installationId != :installationId)', { userId, installationId: input.installationId })
                .execute();
            let device = await manager.getRepository(push_device_entity_1.PushDevice).findOne({
                where: { userId, installationId: input.installationId },
            });
            if (!device) {
                device = manager.getRepository(push_device_entity_1.PushDevice).create({ userId });
            }
            Object.assign(device, input, { lastSeenAt: new Date() });
            return manager.save(device);
        });
        return { device: this.formatDevice(saved) };
    }
    async listDevices(userId) {
        const devices = await this.deviceRepo.find({
            where: { userId },
            order: { updatedAt: 'DESC' },
        });
        return { data: devices.map((device) => this.formatDevice(device)) };
    }
    async updateDevice(userId, installationId, input) {
        const device = await this.deviceRepo.findOne({
            where: { userId, installationId },
        });
        if (!device)
            throw new common_1.NotFoundException('Push device not found');
        Object.assign(device, input, { lastSeenAt: new Date() });
        return { device: this.formatDevice(await this.deviceRepo.save(device)) };
    }
    async removeDevice(userId, installationId) {
        await this.deviceRepo.delete({ userId, installationId });
        return { message: 'Push device removed successfully' };
    }
    async removeAllForUser(userId) {
        await this.deviceRepo.delete({ userId });
    }
    async getPreferences(userId) {
        return { preferences: this.formatPreferences(await this.getOrCreatePreferences(userId)) };
    }
    async updatePreferences(userId, patch) {
        const preferences = await this.getOrCreatePreferences(userId);
        Object.assign(preferences, patch);
        return {
            preferences: this.formatPreferences(await this.preferenceRepo.save(preferences)),
        };
    }
    async sendToUser(userId, category, title, body, data = {}) {
        const preferences = await this.getOrCreatePreferences(userId);
        if (category !== 'security' &&
            (!preferences.enabled || !preferences[category])) {
            return { delivered: 0, skipped: true };
        }
        const conversationId = String(data.conversationId || data.chatId || '').trim();
        if (category === 'messages' &&
            conversationId &&
            (await this.presenceService.isActive(userId, conversationId))) {
            return { delivered: 0, skipped: true };
        }
        const devices = await this.deviceRepo.find({ where: { userId } });
        if (!devices.length)
            return { delivered: 0, skipped: false };
        const payload = Object.fromEntries(Object.entries(data)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]));
        const result = await this.firebaseService.sendNotification(devices.map((device) => device.token), title, body, payload);
        const invalidTokens = new Set(result.invalidTokens || []);
        if (invalidTokens.size) {
            await this.deviceRepo
                .createQueryBuilder()
                .delete()
                .where('token IN (:...tokens)', { tokens: [...invalidTokens] })
                .execute();
        }
        return { delivered: result.successCount, skipped: false };
    }
    async getOrCreatePreferences(userId) {
        const existing = await this.preferenceRepo.findOne({ where: { userId } });
        if (existing)
            return existing;
        return this.preferenceRepo.save(this.preferenceRepo.create({ userId }));
    }
    formatDevice(device) {
        return {
            installationId: device.installationId,
            platform: device.platform,
            appVersion: device.appVersion || null,
            locale: device.locale || null,
            updatedAt: device.updatedAt,
        };
    }
    formatPreferences(preferences) {
        return {
            enabled: preferences.enabled,
            jobs: preferences.jobs,
            applications: preferences.applications,
            messages: preferences.messages,
            community: preferences.community,
            videos: preferences.videos,
            company: preferences.company,
            support: preferences.support,
        };
    }
};
exports.PushService = PushService;
exports.PushService = PushService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(push_device_entity_1.PushDevice)),
    __param(1, (0, typeorm_1.InjectRepository)(notification_preference_entity_1.NotificationPreference)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService,
        realtime_presence_service_1.RealtimePresenceService])
], PushService);
//# sourceMappingURL=push.service.js.map