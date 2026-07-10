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
const filter_entity_1 = require("../filter/entities/filter.entity");
const filter_icon_util_1 = require("../filter/filter-icon.util");
let UsersService = class UsersService {
    constructor(userRepo, filterRepo, firebaseService) {
        this.userRepo = userRepo;
        this.filterRepo = filterRepo;
        this.firebaseService = firebaseService;
    }
    normalizeFilterPreferenceIds(preferences) {
        if (!Array.isArray(preferences))
            return [];
        const ids = preferences
            .map((preference) => Number(preference))
            .filter((preference) => Number.isInteger(preference) && preference > 0);
        return Array.from(new Set(ids));
    }
    hasInvalidFilterPreferenceIds(preferences) {
        return preferences.some((preference) => {
            const id = Number(preference);
            return !Number.isInteger(id) || id <= 0;
        });
    }
    async findFiltersInPreferenceOrder(preferenceIds) {
        if (!preferenceIds.length)
            return [];
        const filters = await this.filterRepo.find({
            where: { id: (0, typeorm_2.In)(preferenceIds) },
        });
        const filtersById = new Map(filters.map((filter) => [filter.id, filter]));
        return preferenceIds
            .map((id) => filtersById.get(id))
            .filter((filter) => Boolean(filter))
            .map((filter) => (0, filter_icon_util_1.withFilterIconMeta)(filter));
    }
    async getUserById(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['country', 'language'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateUser(id, data) {
        const user = await this.userRepo.findOne({ where: { id } });
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
            select: ['id', 'filter_preferences'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user session');
        }
        const preferenceIds = this.normalizeFilterPreferenceIds(user.filter_preferences);
        const filters = await this.findFiltersInPreferenceOrder(preferenceIds);
        return { data: preferenceIds, filters };
    }
    async updateUserFilterPreferences(userId, newFilters) {
        if (this.hasInvalidFilterPreferenceIds(newFilters)) {
            throw new common_1.BadRequestException('Filter preferences must be valid IDs');
        }
        const newFilterIds = this.normalizeFilterPreferenceIds(newFilters);
        const existingFilters = newFilterIds.length
            ? await this.filterRepo.find({
                where: { id: (0, typeorm_2.In)(newFilterIds) },
                select: ['id'],
            })
            : [];
        if (existingFilters.length !== newFilterIds.length) {
            throw new common_1.BadRequestException('One or more filter preferences are invalid');
        }
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'filter_preferences', 'fcmTokens'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid user session');
        }
        const oldFilters = this.normalizeFilterPreferenceIds(user.filter_preferences);
        user.filter_preferences = newFilterIds;
        await this.userRepo.save(user);
        for (const token of user.fcmTokens || []) {
            await this.firebaseService.updateFilterSubscriptions(token, oldFilters, newFilterIds);
        }
        return newFilterIds;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        firebase_service_1.FirebaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map