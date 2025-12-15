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
let FilterService = class FilterService {
    constructor(filterRepo, userRepo) {
        this.filterRepo = filterRepo;
        this.userRepo = userRepo;
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
            icon: data.icon ?? "{icon: 'infinity'}",
            status: data.status ?? 'active',
            approvalStatus: 'pending',
            createdBy: data.createdBy,
        });
        return this.filterRepo.save(filter);
    }
    async getFilters(query) {
        const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC', approvalStatus, createdBy, preference_ids = [], } = query;
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
        const [filters, total] = await this.filterRepo.findAndCount({
            where,
            take: limit,
            skip: (page - 1) * limit,
            order: {
                [sortBy]: sortOrder.toUpperCase(),
            },
            relations: ['jobs'],
        });
        const data = filters.map((f) => ({
            ...f,
            jobCount: f.jobs.length,
            isPreferred: preference_ids.includes(f.id),
            jobs: undefined,
        }));
        return {
            data,
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
        return filter;
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