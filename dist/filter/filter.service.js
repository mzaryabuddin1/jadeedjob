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
exports.FilterService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const filter_entity_1 = require("./entities/filter.entity");
const user_entity_1 = require("../users/entities/user.entity");
const utils_util_1 = require("../common/utils/utils.util");
const seed_filters_data_1 = require("./seed-filters.data");
let FilterService = class FilterService {
    constructor(filterRepo, userRepo) {
        this.filterRepo = filterRepo;
        this.userRepo = userRepo;
    }
    async getLastUpdateTime(options) {
        const qb = this.filterRepo
            .createQueryBuilder('filter')
            .select('MAX(filter.updatedAt)', 'lastUpdate');
        if (options?.approvedOnly) {
            qb.where('filter.approvalStatus = :approval', {
                approval: 'approved',
            }).andWhere('filter.status = :status', { status: 'active' });
        }
        const raw = await qb.getRawOne();
        if (!raw?.lastUpdate)
            return null;
        return new Date(raw.lastUpdate).toISOString();
    }
    toPublicFilter(filter) {
        return {
            id: filter.id,
            name: filter.name,
            icon: this.normalizeIcon(filter.icon),
            status: filter.status,
            approvalStatus: filter.approvalStatus,
            createdAt: filter.createdAt,
            updatedAt: filter.updatedAt,
        };
    }
    normalizeIcon(icon) {
        return (0, filter_entity_1.normalizeFilterIcon)(icon);
    }
    async getFilters(query, options) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC', createdBy, preference = true, } = query;
        const usePreference = preference === true ||
            preference === 'true' ||
            preference === 1 ||
            preference === '1';
        const where = {};
        if (options?.approvedOnly) {
            where.approvalStatus = 'approved';
            where.status = 'active';
        }
        if (search) {
            where.name = (0, typeorm_2.Like)(`%${search}%`);
        }
        if (createdBy && !options?.approvedOnly) {
            where.createdBy = createdBy;
        }
        const filters = await this.filterRepo.find({
            where,
            order: {
                [sortBy]: sortOrder.toUpperCase(),
            },
        });
        let orderedFilters = filters;
        const userId = options?.userId;
        if (usePreference && userId) {
            try {
                const row = await this.userRepo
                    .createQueryBuilder('u')
                    .select(['u.id', 'u.filter_preferences'])
                    .where('u.id = :userId', { userId })
                    .getOne();
                const preferences = Array.isArray(row?.filter_preferences)
                    ? row.filter_preferences.map(Number).filter((n) => !Number.isNaN(n))
                    : [];
                if (preferences.length) {
                    const byId = new Map(filters.map((f) => [f.id, f]));
                    const preferred = [];
                    const preferredIds = new Set();
                    for (const id of preferences) {
                        const f = byId.get(Number(id));
                        if (f) {
                            preferred.push(f);
                            preferredIds.add(f.id);
                        }
                    }
                    const others = filters.filter((f) => !preferredIds.has(f.id));
                    orderedFilters = [...preferred, ...others];
                }
            }
            catch {
                orderedFilters = filters;
            }
        }
        const total = orderedFilters.length;
        const paginatedData = orderedFilters.slice((page - 1) * limit, page * limit);
        const last_update_time = await this.getLastUpdateTime({
            approvedOnly: options?.approvedOnly,
        });
        return {
            last_update_time,
            data: paginatedData.map((f) => this.toPublicFilter(f)),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
        };
    }
    async filterById(id, options) {
        const where = { id };
        if (options?.approvedOnly) {
            where.approvalStatus = 'approved';
            where.status = 'active';
        }
        const filter = await this.filterRepo.findOne({ where: where });
        if (!filter) {
            throw new common_1.NotFoundException('Filter not found');
        }
        const last_update_time = await this.getLastUpdateTime({
            approvedOnly: options?.approvedOnly,
        });
        return {
            last_update_time,
            filter: this.toPublicFilter(filter),
        };
    }
    async getTopFiltersByJobs(limit = 9) {
        const result = await this.filterRepo
            .createQueryBuilder('filter')
            .leftJoin('filter.taggedJobs', 'tagged')
            .leftJoin('filter.jobs', 'primaryJob')
            .select('filter.id', 'filterId')
            .addSelect('COUNT(DISTINCT COALESCE(tagged.id, primaryJob.id))', 'jobCount')
            .where('filter.status = :status', { status: 'active' })
            .andWhere('filter.approvalStatus = :approval', {
            approval: 'approved',
        })
            .groupBy('filter.id')
            .orderBy('jobCount', 'DESC')
            .addOrderBy('filter.id', 'ASC')
            .limit(limit)
            .getRawMany();
        const ids = result.map((r) => Number(r.filterId)).filter(Boolean);
        if (ids.length >= limit)
            return ids.slice(0, limit);
        const extras = await this.filterRepo.find({
            where: { status: 'active', approvalStatus: 'approved' },
            order: { id: 'ASC' },
            take: limit,
            select: ['id'],
        });
        const merged = [...new Set([...ids, ...extras.map((f) => f.id)])];
        return merged.slice(0, limit);
    }
    async seedFakeFilters(options) {
        const approve = options?.approve !== false;
        const updateIcons = options?.updateIcons === true;
        let createdBy = options?.createdBy ?? null;
        if (createdBy == null) {
            const firstUser = await this.userRepo.findOne({
                where: {},
                order: { id: 'ASC' },
                select: ['id'],
            });
            createdBy = firstUser?.id ?? null;
        }
        const created = [];
        const updated = [];
        const skipped = [];
        for (const item of seed_filters_data_1.SEED_FILTERS) {
            const name = (0, utils_util_1.toSentenceCase)(item.name);
            const icon = item.icon;
            const existing = await this.filterRepo.findOne({ where: { name } });
            if (existing) {
                if (updateIcons) {
                    existing.icon = icon;
                    existing.status = 'active';
                    if (approve)
                        existing.approvalStatus = 'approved';
                    updated.push(await this.filterRepo.save(existing));
                }
                else {
                    skipped.push(name);
                }
                continue;
            }
            const filter = await this.filterRepo.save(this.filterRepo.create({
                name,
                icon,
                status: 'active',
                approvalStatus: approve ? 'approved' : 'pending',
                createdBy,
            }));
            created.push(filter);
        }
        return { created, updated, skipped };
    }
};
exports.FilterService = FilterService;
exports.FilterService = FilterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(filter_entity_1.Filter)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FilterService);
//# sourceMappingURL=filter.service.js.map