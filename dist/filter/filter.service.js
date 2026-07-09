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
const DEFAULT_ICON_COLOR = '#2563EB';
const FALLBACK_ICON_COLOR = '#6B7280';
const FALLBACK_ICON_LIBRARY = 'Feather';
const FALLBACK_ICON_NAME = 'briefcase';
const ICON_LIBRARIES = ['Feather', 'FontAwesome', 'FontAwesome5'];
const ICON_SOURCES = ['library', 'svg'];
const SAFE_SVG_TAGS = [
    'svg',
    'g',
    'path',
    'circle',
    'rect',
    'line',
    'polyline',
    'polygon',
    'ellipse',
    'defs',
    'clipPath',
    'title',
    'desc',
];
let FilterService = class FilterService {
    constructor(filterRepo, userRepo) {
        this.filterRepo = filterRepo;
        this.userRepo = userRepo;
    }
    sanitizeInlineSvg(svg) {
        if (!svg || svg.length > 8000) {
            throw new common_1.BadRequestException('Invalid SVG icon');
        }
        const blockedPattern = /<\s*(script|foreignObject|iframe|object|embed|image|use|style|link|meta|base)\b|on[a-z]+\s*=|javascript:|data:|href\s*=|xlink:href\s*=/i;
        if (blockedPattern.test(svg)) {
            throw new common_1.BadRequestException('Unsafe SVG icon');
        }
        const tagPattern = /<\/?\s*([a-zA-Z][\w:-]*)\b/g;
        let match;
        while ((match = tagPattern.exec(svg)) !== null) {
            if (!SAFE_SVG_TAGS.includes(match[1])) {
                throw new common_1.BadRequestException('Unsupported SVG icon tag');
            }
        }
        return svg.trim();
    }
    normalizeIconData(data) {
        const requestedIconSource = data.iconSource;
        const iconSource = ICON_SOURCES.includes(requestedIconSource)
            ? requestedIconSource
            : 'library';
        const iconColor = data.iconColor || DEFAULT_ICON_COLOR;
        if (iconSource === 'svg') {
            return {
                icon: data.icon || data.iconName || 'custom-svg',
                iconSource,
                iconLibrary: null,
                iconName: null,
                iconColor,
                iconSvg: this.sanitizeInlineSvg(data.iconSvg),
            };
        }
        const requestedIconLibrary = data.iconLibrary;
        const iconLibrary = ICON_LIBRARIES.includes(requestedIconLibrary)
            ? requestedIconLibrary
            : FALLBACK_ICON_LIBRARY;
        const iconName = data.iconName || data.icon || FALLBACK_ICON_NAME;
        return {
            icon: data.icon || iconName,
            iconSource: 'library',
            iconLibrary,
            iconName,
            iconColor,
            iconSvg: null,
        };
    }
    buildIconMeta(filter) {
        if (filter.iconSource === 'svg' && filter.iconSvg) {
            return {
                source: 'svg',
                svg: filter.iconSvg,
                color: filter.iconColor || DEFAULT_ICON_COLOR,
            };
        }
        return {
            source: 'library',
            library: ICON_LIBRARIES.includes(filter.iconLibrary)
                ? filter.iconLibrary
                : FALLBACK_ICON_LIBRARY,
            name: filter.iconName || filter.icon || FALLBACK_ICON_NAME,
            color: filter.iconColor || FALLBACK_ICON_COLOR,
        };
    }
    withIconMeta(filter) {
        return {
            ...filter,
            iconMeta: this.buildIconMeta(filter),
        };
    }
    async createFilter(data) {
        const exists = await this.filterRepo.findOne({
            where: { name: data.name },
        });
        if (exists) {
            throw new common_1.BadRequestException('Filter already exists');
        }
        const filter = this.filterRepo.create({
            name: data.name,
            ...this.normalizeIconData(data),
            status: data.status ?? 'active',
            approvalStatus: 'pending',
            createdBy: data.createdBy,
        });
        return this.withIconMeta(await this.filterRepo.save(filter));
    }
    async getFilters(query, userId) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC', approvalStatus, createdBy, preference = true, } = query;
        const where = {};
        if (search) {
            where.name = (0, typeorm_2.Like)(`%${search}%`);
        }
        if (approvalStatus) {
            where.approvalStatus = approvalStatus;
        }
        if (createdBy) {
            where.createdBy = createdBy;
        }
        const filters = await this.filterRepo.find({
            where,
            order: {
                [sortBy]: sortOrder.toUpperCase(),
            },
        });
        let orderedFilters = filters;
        if (preference === true && userId) {
            const user = await this.userRepo.findOne({
                where: { id: userId },
                select: ['filter_preferences'],
            });
            const preferences = user?.filter_preferences ?? [];
            if (preferences.length) {
                const preferred = [];
                const others = [];
                for (const filter of filters) {
                    if (preferences.includes(filter.id)) {
                        preferred.push(filter);
                    }
                    else {
                        others.push(filter);
                    }
                }
                orderedFilters = [...preferred, ...others];
            }
        }
        const total = orderedFilters.length;
        const paginatedData = orderedFilters.slice((page - 1) * limit, page * limit);
        return {
            data: paginatedData.map((filter) => this.withIconMeta(filter)),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
        };
    }
    async filterById(id) {
        const filter = await this.filterRepo.findOne({
            where: { id },
        });
        if (!filter) {
            throw new common_1.NotFoundException('Filter not found');
        }
        return this.withIconMeta(filter);
    }
    async getTopFiltersByJobs(limit = 9) {
        const result = await this.filterRepo
            .createQueryBuilder('filter')
            .leftJoin('filter.jobs', 'job')
            .select('filter.id', 'filterId')
            .addSelect('COUNT(job.id)', 'jobCount')
            .where('filter.status = :status', { status: 'active' })
            .groupBy('filter.id')
            .orderBy('jobCount', 'DESC')
            .limit(limit)
            .getRawMany();
        return result.map(r => Number(r.filterId));
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