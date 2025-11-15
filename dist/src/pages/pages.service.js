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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PagesService = class PagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPage(data, userId) {
        const existing = await this.prisma.page.findFirst({
            where: { ownerId: userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('User already has a company page.');
        }
        const page = await this.prisma.page.create({
            data: {
                ...data,
                ownerId: userId,
            },
        });
        return {
            message: 'Company page created successfully',
            data: page,
        };
    }
    async getPages(query, userId) {
        const { page = 1, limit = 20, search = '', mine = false, } = query;
        const where = {};
        if (search) {
            where.company_name = {
                contains: search,
                mode: 'insensitive',
            };
        }
        if (mine && userId) {
            where.ownerId = userId;
        }
        const total = await this.prisma.page.count({ where });
        const data = await this.prisma.page.findMany({
            where,
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
            orderBy: { createdAt: 'desc' },
        });
        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
                limit: Number(limit),
            },
        };
    }
    async getPageById(id) {
        const page = await this.prisma.page.findUnique({
            where: { id },
        });
        if (!page)
            throw new common_1.BadRequestException('Company page not found');
        return page;
    }
    async updatePage(id, data, userId) {
        const page = await this.prisma.page.findFirst({
            where: { id, ownerId: userId },
        });
        if (!page) {
            throw new common_1.BadRequestException('Page not found or you are not authorized to update it');
        }
        const updated = await this.prisma.page.update({
            where: { id },
            data,
        });
        return {
            message: 'Page updated successfully',
            data: updated,
        };
    }
    async deletePage(id, userId) {
        const page = await this.prisma.page.findFirst({
            where: { id, ownerId: userId },
        });
        if (!page) {
            throw new common_1.BadRequestException('Page not found or you are not authorized to delete it');
        }
        await this.prisma.page.delete({ where: { id } });
        return { message: 'Page deleted successfully' };
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PagesService);
//# sourceMappingURL=pages.service.js.map