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
const page_member_entity_1 = require("./entities/page-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
let PagesService = class PagesService {
    constructor(pageRepo, memberRepo, userRepo) {
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.userRepo = userRepo;
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
        const { page = 1, limit = 20, search, mine = false } = query;
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.members', 'member');
        if (search) {
            qb.andWhere('(page.company_name LIKE :search OR page.username LIKE :search)', { search: `%${search}%` });
        }
        if (mine) {
            qb.andWhere('(page.ownerId = :userId OR member.userId = :userId)', {
                userId,
            });
        }
        qb.orderBy('page.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return {
            data: data.map((p) => {
                const member = p.members.find((m) => m.userId === userId);
                return {
                    ...p,
                    association: member
                        ? member.role
                        : p.ownerId === userId
                            ? 'owner'
                            : 'public',
                };
            }),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
        };
    }
    async addMember(pageId, targetUserId, role, requesterId) {
        if (!['admin', 'editor'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.ownerId === requesterId
            ? { role: 'owner' }
            : page.members.find((m) => m.userId === requesterId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('You are not allowed to add members to this page');
        }
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('User is already the owner');
        }
        const user = await this.userRepo.findOne({
            where: { id: targetUserId },
        });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const exists = page.members.find((m) => m.userId === targetUserId);
        if (exists) {
            throw new common_1.BadRequestException('User is already a member');
        }
        const member = this.memberRepo.create({
            pageId,
            userId: targetUserId,
            role,
        });
        await this.memberRepo.save(member);
        return {
            message: 'Member added successfully',
            data: {
                pageId,
                userId: targetUserId,
                role,
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
    async removeMember(pageId, memberId, requesterId) {
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.members.find((m) => m.userId === requesterId);
        const target = page.members.find((m) => m.userId === memberId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('Not authorized');
        }
        if (!target)
            throw new common_1.BadRequestException('Member not found');
        if (target.role === 'owner') {
            throw new common_1.BadRequestException('Owner cannot be removed');
        }
        await this.pageRepo.manager.delete('page_members', {
            pageId,
            userId: memberId,
        });
        return { message: 'Member removed successfully' };
    }
    async changeMemberRole(pageId, targetUserId, newRole, requesterId) {
        if (!['admin', 'editor'].includes(newRole)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.BadRequestException('Page not found');
        const requester = page.ownerId === requesterId
            ? { role: 'owner' }
            : page.members.find((m) => m.userId === requesterId);
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            throw new common_1.BadRequestException('You are not allowed to change member roles');
        }
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('Owner role cannot be changed');
        }
        const target = page.members.find((m) => m.userId === targetUserId);
        if (!target) {
            throw new common_1.BadRequestException('Member not found');
        }
        if (requester.role === 'admin') {
            if (target.role === 'admin' && newRole === 'admin') {
                throw new common_1.BadRequestException('No role change required');
            }
        }
        target.role = newRole;
        await this.pageRepo.manager.save(target);
        return {
            message: 'Member role updated successfully',
            data: {
                pageId,
                userId: targetUserId,
                role: newRole,
            },
        };
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(1, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PagesService);
//# sourceMappingURL=pages.service.js.map