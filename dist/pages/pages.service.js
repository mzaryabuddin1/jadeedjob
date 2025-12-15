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
const company_page_entity_1 = require("./entities/company-page.entity");
let PagesService = class PagesService {
    constructor(pageRepo) {
        this.pageRepo = pageRepo;
    }
    async createPage(data, userId) {
        let username = data.username?.toLowerCase();
        if (username) {
            if (!/^[a-z0-9.-]+$/.test(username)) {
                throw new common_1.BadRequestException('Username can only contain a-z, 0-9, dot(.) and dash(-)');
            }
            const exists = await this.pageRepo.findOne({ where: { username } });
            if (exists)
                throw new common_1.BadRequestException('Username already taken');
        }
        else {
            username = data.company_name
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, '-')
                .replace(/-+/g, '-');
            let counter = 0;
            let unique = username;
            while (await this.pageRepo.findOne({ where: { username: unique } })) {
                counter++;
                unique = `${username}-${counter}`;
            }
            username = unique;
        }
        const page = this.pageRepo.create({
            ...data,
            username,
            ownerId: userId,
            members: [
                {
                    userId,
                    role: 'owner',
                },
            ],
        });
        await this.pageRepo.save(page);
        return {
            message: 'Page created successfully',
            data: page,
        };
    }
    async getPages(query, userId) {
        const { page = 1, limit = 20, search, mine = false, } = query;
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.members', 'member');
        if (search) {
            qb.andWhere('(page.company_name LIKE :search OR page.username LIKE :search)', { search: `%${search}%` });
        }
        if (mine) {
            qb.andWhere('(page.ownerId = :userId OR member.userId = :userId)', { userId });
        }
        qb.orderBy('page.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return {
            data: data.map((p) => ({
                ...p,
                mine: p.ownerId === userId ||
                    p.members.some((m) => m.userId === userId),
            })),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
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
            where: { id },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const member = page.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new common_1.BadRequestException('You are not allowed to update this page');
        }
        await this.pageRepo.update(id, data);
        return {
            message: 'Page updated successfully',
            data: await this.pageRepo.findOne({ where: { id } }),
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
    __param(0, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PagesService);
//# sourceMappingURL=pages.service.js.map