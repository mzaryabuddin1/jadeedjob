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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const page_entity_1 = require("./entities/page.entity");
let PagesService = class PagesService {
    constructor(pageRepo) {
        this.pageRepo = pageRepo;
    }
    async createPage(data, userId) {
        const existing = await this.pageRepo.findOne({
            where: { ownerId: userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('User already has a company page.');
        }
        const page = this.pageRepo.create({
            ...data,
            ownerId: userId,
        });
        await this.pageRepo.save(page);
        return {
            message: 'Company page created successfully',
            data: page,
        };
    }
    async getPages(query, userId) {
        const { page = 1, limit = 20, search = '', mine = false, } = query;
        const where = {};
        if (search) {
            where.company_name = (0, typeorm_2.Like)(`%${search}%`);
        }
        if (mine && userId) {
            where.ownerId = userId;
        }
        const [data, total] = await this.pageRepo.findAndCount({
            where,
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
            order: { createdAt: 'DESC' },
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
        const page = await this.pageRepo.findOne({ where: { id } });
        if (!page) {
            throw new common_1.BadRequestException('Company page not found');
        }
        return page;
    }
    async updatePage(id, data, userId) {
        const page = await this.pageRepo.findOne({
            where: { id, ownerId: userId },
        });
        if (!page) {
            throw new common_1.BadRequestException('Page not found or you are not authorized to update it');
        }
        await this.pageRepo.update(id, data);
        const updated = await this.pageRepo.findOne({ where: { id } });
        return {
            message: 'Page updated successfully',
            data: updated,
        };
    }
    async deletePage(id, userId) {
        const page = await this.pageRepo.findOne({
            where: { id, ownerId: userId },
        });
        if (!page) {
            throw new common_1.BadRequestException('Page not found or you are not authorized to delete it');
        }
        await this.pageRepo.delete(id);
        return { message: 'Page deleted successfully' };
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PagesService);
//# sourceMappingURL=pages.service.js.map