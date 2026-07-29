"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimePresenceService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const redis_1 = require("redis");
let RealtimePresenceService = class RealtimePresenceService {
    constructor() {
        this.instanceId = (0, crypto_1.randomUUID)();
        this.local = new Map();
        this.socketKeys = new Map();
        this.redis = null;
    }
    async onModuleInit() {
        if (!['staging', 'production'].includes(process.env.NODE_ENV || ''))
            return;
        const redisUrl = String(process.env.REDIS_URL || '').trim();
        if (!redisUrl)
            throw new Error('REDIS_URL is required');
        this.redis = (0, redis_1.createClient)({ url: redisUrl });
        await this.redis.connect();
    }
    async onApplicationShutdown() {
        if (this.redis?.isOpen)
            await this.redis.quit();
    }
    async markActive(userId, conversationId, socketId) {
        const key = this.key(userId, conversationId);
        const sockets = this.local.get(key) || new Set();
        sockets.add(socketId);
        this.local.set(key, sockets);
        const keys = this.socketKeys.get(socketId) || new Set();
        keys.add(key);
        this.socketKeys.set(socketId, keys);
        if (this.redis) {
            await this.redis.hSet(key, `${this.instanceId}:${socketId}`, Date.now());
            await this.redis.expire(key, 2 * 60 * 60);
        }
    }
    async markInactive(userId, conversationId, socketId) {
        await this.removeSocketFromKey(this.key(userId, conversationId), socketId);
    }
    async clearSocket(socketId) {
        const keys = [...(this.socketKeys.get(socketId) || [])];
        await Promise.all(keys.map((key) => this.removeSocketFromKey(key, socketId)));
        this.socketKeys.delete(socketId);
    }
    async isActive(userId, conversationId) {
        const key = this.key(userId, conversationId);
        if ((this.local.get(key)?.size || 0) > 0)
            return true;
        return this.redis ? (await this.redis.hLen(key)) > 0 : false;
    }
    async removeSocketFromKey(key, socketId) {
        const sockets = this.local.get(key);
        sockets?.delete(socketId);
        if (!sockets?.size)
            this.local.delete(key);
        const keys = this.socketKeys.get(socketId);
        keys?.delete(key);
        if (!keys?.size)
            this.socketKeys.delete(socketId);
        if (this.redis) {
            await this.redis.hDel(key, `${this.instanceId}:${socketId}`);
        }
    }
    key(userId, conversationId) {
        return `presence:chat:${userId}:${conversationId}`;
    }
};
exports.RealtimePresenceService = RealtimePresenceService;
exports.RealtimePresenceService = RealtimePresenceService = __decorate([
    (0, common_1.Injectable)()
], RealtimePresenceService);
//# sourceMappingURL=realtime-presence.service.js.map