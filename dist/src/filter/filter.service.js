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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FilterService = class FilterService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createFilter(data) {
        return this.prisma.filter.create({
            data: {
                name: data.name,
                icon: data.icon ?? 'fas fa-user-tie',
                status: data.status ?? 'active',
                approvalStatus: 'pending',
                rejectionReason: null,
                createdBy: data.createdBy,
            },
        });
    }
    async getFilters(query) {
        const { page = 1, limit = 20, search, preference_ids = [], sortBy = 'createdAt', sortOrder = 'desc', approvalStatus, createdBy, } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        if (approvalStatus) {
            where.approvalStatus = approvalStatus;
        }
        if (createdBy) {
            where.createdBy = Number(createdBy);
        }
        const [filters, total] = await Promise.all([
            this.prisma.filter.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
                include: {
                    jobs: {
                        where: { isActive: true },
                        select: { id: true },
                    },
                },
            }),
            this.prisma.filter.count({ where }),
        ]);
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
        const filter = await this.prisma.filter.findUnique({
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FilterService);
//# sourceMappingURL=filter.service.js.map