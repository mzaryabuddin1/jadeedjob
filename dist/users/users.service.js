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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const firebase_service_1 = require("../firebase/firebase.service");
const username_util_1 = require("./username.util");
const notification_settings_1 = require("../notification/notification-settings");
let UsersService = class UsersService {
    constructor(userRepo, firebaseService) {
        this.userRepo = userRepo;
        this.firebaseService = firebaseService;
    }
    async getUserById(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language', 'cityEntity'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateUser(id, data) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language', 'cityEntity'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        Object.assign(user, data);
        return this.userRepo.save(user);
    }
    async findUsersByIds(ids) {
        return this.userRepo.find({
            where: { id: (0, typeorm_2.In)(ids) },
        });
    }
    async getUserPreference(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
        });
        return { data: user.filter_preferences ?? [] };
    }
    async getNotificationSettings(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'notification_settings'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return (0, notification_settings_1.resolveNotificationSettings)(user.notification_settings);
    }
    async updateNotificationSettings(userId, patch) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'email', 'notification_settings'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (patch.email === true && !user.email) {
            throw new common_1.BadRequestException('Add an email to your account before enabling email notifications');
        }
        const next = {
            ...(0, notification_settings_1.resolveNotificationSettings)(user.notification_settings),
            ...patch,
        };
        await this.userRepo.update({ id: userId }, { notification_settings: next });
        return next;
    }
    nextUsernameChangeAt(changedAt) {
        if (!changedAt)
            return null;
        const next = new Date(new Date(changedAt).getTime() + username_util_1.USERNAME_COOLDOWN_MS);
        return next.getTime() > Date.now() ? next : null;
    }
    async getUsernameInfo(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'username', 'usernameChangedAt'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const next = this.nextUsernameChangeAt(user.usernameChangedAt);
        return {
            username: user.username,
            canChangeNow: !next,
            nextChangeAt: next,
            cooldownDays: username_util_1.USERNAME_COOLDOWN_DAYS,
        };
    }
    async checkUsernameAvailable(userId, raw) {
        const username = (0, username_util_1.normalizeUsername)(raw);
        if (!username_util_1.USERNAME_PATTERN.test(username)) {
            return {
                username,
                valid: false,
                available: false,
                reason: username_util_1.USERNAME_RULES_TEXT,
            };
        }
        const owner = await this.userRepo.findOne({
            where: { username },
            select: ['id'],
        });
        if (owner?.id === userId) {
            return {
                username,
                valid: true,
                available: false,
                reason: 'This is already your username',
            };
        }
        if (owner) {
            return {
                username,
                valid: true,
                available: false,
                reason: 'Username already taken',
            };
        }
        return { username, valid: true, available: true };
    }
    async changeUsername(userId, raw) {
        const username = (0, username_util_1.normalizeUsername)(raw);
        if (!username_util_1.USERNAME_PATTERN.test(username)) {
            throw new common_1.BadRequestException(username_util_1.USERNAME_RULES_TEXT);
        }
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'username', 'usernameChangedAt'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.username === username) {
            throw new common_1.BadRequestException('This is already your username');
        }
        const next = this.nextUsernameChangeAt(user.usernameChangedAt);
        if (next) {
            throw new common_1.BadRequestException(`You can change your username once every ${username_util_1.USERNAME_COOLDOWN_DAYS} days. Next change available at ${next.toISOString()}`);
        }
        const taken = await this.userRepo.findOne({
            where: { username },
            select: ['id'],
        });
        if (taken)
            throw new common_1.ConflictException('Username already taken');
        const changedAt = new Date();
        try {
            await this.userRepo.update({ id: userId }, { username, usernameChangedAt: changedAt });
        }
        catch (err) {
            if (err?.code === 'ER_DUP_ENTRY') {
                throw new common_1.ConflictException('Username already taken');
            }
            throw err;
        }
        return {
            message: 'Username updated',
            username,
            canChangeNow: false,
            nextChangeAt: new Date(changedAt.getTime() + username_util_1.USERNAME_COOLDOWN_MS),
            cooldownDays: username_util_1.USERNAME_COOLDOWN_DAYS,
        };
    }
    async updateUserFilterPreferences(userId, newFilters) {
        const unique = [...new Set(newFilters.map(Number))].filter((n) => !Number.isNaN(n) && n > 0);
        if (unique.length < 4) {
            throw new common_1.BadRequestException('Select at least 4 filter preferences');
        }
        if (unique.length > 30) {
            throw new common_1.BadRequestException('You can select at most 30 filter preferences');
        }
        const user = await this.userRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.filter_preferences', 'u.fcmTokens'])
            .where('u.id = :userId', { userId })
            .getOne();
        if (!user)
            return;
        const oldFilters = user.filter_preferences || [];
        user.filter_preferences = unique;
        await this.userRepo.save(user);
        for (const token of user.fcmTokens || []) {
            await this.firebaseService.updateFilterSubscriptions(token, oldFilters, unique);
        }
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map