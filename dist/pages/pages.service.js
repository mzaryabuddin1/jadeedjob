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
const page_member_entity_1 = require("./entities/page-member.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const page_permissions_1 = require("./page-permissions");
const page_view_1 = require("./page-view");
const page_verification_service_1 = require("./page-verification.service");
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,38}[a-z0-9]$/;
let PagesService = class PagesService {
    constructor(pageRepo, memberRepo, userRepo, verificationService) {
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.userRepo = userRepo;
        this.verificationService = verificationService;
    }
    roleOf(page, userId) {
        if (page.ownerId === userId)
            return 'owner';
        return (page.members || []).find((m) => m.userId === userId)?.role ?? null;
    }
    async requirePage(id) {
        const page = await this.pageRepo.findOne({
            where: { id },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return page;
    }
    async requirePermission(pageId, userId, permission, action = 'do this') {
        const page = await this.requirePage(pageId);
        const role = this.roleOf(page, userId);
        if (!(0, page_permissions_1.roleHasPermission)(role, permission)) {
            throw new common_1.ForbiddenException(`Your role on this page cannot ${action}`);
        }
        return { page, role: role };
    }
    getRoles() {
        return {
            assignable: page_permissions_1.ASSIGNABLE_ROLES,
            roles: Object.fromEntries(Object.keys(page_permissions_1.ROLE_PERMISSIONS).map((r) => [
                r,
                page_permissions_1.ROLE_PERMISSIONS[r],
            ])),
            allPermissions: page_permissions_1.PAGE_PERMISSIONS,
            rules: [
                'Only the owner can invite someone as admin or change roles',
                'An admin can invite and remove editors only',
                'The owner cannot be removed, demoted or leave; delete the page instead',
                'Nobody joins without accepting an invitation',
            ],
        };
    }
    async uniqueUsername(base) {
        let candidate = base;
        let counter = 0;
        while (await this.pageRepo.exist({ where: { username: candidate } })) {
            counter++;
            candidate = `${base}-${counter}`;
        }
        return candidate;
    }
    async createPage(data, userId) {
        let username = data.username?.toLowerCase();
        if (username) {
            if (!USERNAME_PATTERN.test(username)) {
                throw new common_1.BadRequestException('Page username: 3-40 characters, a-z, 0-9, dot and dash, starting and ending with a letter or number');
            }
            if (await this.pageRepo.exist({ where: { username } })) {
                throw new common_1.ConflictException('Username already taken');
            }
        }
        else {
            const base = String(data.page_name)
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 36) || 'page';
            username = await this.uniqueUsername(base.length >= 3 ? base : `${base}-page`);
        }
        const page = this.pageRepo.create({
            ...data,
            username,
            ownerId: userId,
            is_verified: false,
            verification_status: 'none',
            members: [{ userId, role: 'owner' }],
        });
        const saved = (await this.pageRepo.save(page));
        const created = await this.requirePage(saved.id);
        return {
            message: 'Page created successfully',
            data: (0, page_view_1.toPageView)(created, 'owner'),
        };
    }
    async getPages(query, userId) {
        const search = query.search ? String(query.search).trim() : '';
        const mine = ['true', '1', true].includes(query.mine);
        const verifiedOnly = ['true', '1', true].includes(query.verified);
        const currentPage = Math.max(1, Number(query.page) || 1);
        const take = Math.min(50, Math.max(1, Number(query.limit) || 20));
        const qb = this.pageRepo.createQueryBuilder('page');
        if (search) {
            qb.andWhere('(page.page_name LIKE :search OR page.username LIKE :search)', { search: `%${search}%` });
        }
        if (verifiedOnly)
            qb.andWhere('page.is_verified = true');
        if (mine) {
            qb.andWhere('(page.ownerId = :userId OR EXISTS (SELECT 1 FROM page_members pm WHERE pm.pageId = page.id AND pm.userId = :userId))', { userId });
        }
        qb.orderBy('page.createdAt', 'DESC')
            .skip((currentPage - 1) * take)
            .take(take);
        const [pages, total] = await qb.getManyAndCount();
        const memberships = pages.length
            ? await this.memberRepo
                .createQueryBuilder('m')
                .where('m.userId = :userId', { userId })
                .andWhere('m.pageId IN (:...ids)', { ids: pages.map((p) => p.id) })
                .getMany()
            : [];
        const roleByPage = new Map(memberships.map((m) => [m.pageId, m.role]));
        return {
            data: pages.map((p) => {
                const role = p.ownerId === userId ? 'owner' : (roleByPage.get(p.id) ?? null);
                return (0, page_view_1.toPageView)(p, role);
            }),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async getPageById(id, userId) {
        const page = await this.requirePage(id);
        return (0, page_view_1.toPageView)(page, this.roleOf(page, userId));
    }
    async updatePage(id, data, userId) {
        const { page } = await this.requirePermission(id, userId, 'page.edit', 'edit this page');
        const patch = {};
        for (const f of page_view_1.EDITABLE_PAGE_FIELDS) {
            if (data[f] !== undefined)
                patch[f] = data[f];
        }
        if (data.username !== undefined) {
            const username = String(data.username).toLowerCase();
            if (!USERNAME_PATTERN.test(username)) {
                throw new common_1.BadRequestException('Page username: 3-40 characters, a-z, 0-9, dot and dash, starting and ending with a letter or number');
            }
            if (username !== page.username) {
                const taken = await this.pageRepo.findOne({
                    where: { username },
                    select: ['id'],
                });
                if (taken && taken.id !== id) {
                    throw new common_1.ConflictException('Username already taken');
                }
                patch.username = username;
            }
        }
        if (!Object.keys(patch).length) {
            throw new common_1.BadRequestException('Nothing to update');
        }
        await this.pageRepo.update(id, patch);
        return {
            message: 'Page updated successfully',
            data: await this.getPageById(id, userId),
        };
    }
    async deletePage(id, userId) {
        await this.requirePermission(id, userId, 'page.delete', 'delete this page');
        await this.verificationService.deleteFilesForPage(id);
        await this.pageRepo.manager.transaction(async (manager) => {
            await manager.update(job_entity_1.Job, { pageId: id }, {
                isActive: false,
                pageId: null,
            });
            await manager.delete(page_entity_1.Page, id);
        });
        return { message: 'Page deleted successfully' };
    }
    async listMembers(pageId, requesterId) {
        const { page } = await this.requirePermission(pageId, requesterId, 'members.view', 'see the members');
        const members = await this.memberRepo.find({
            where: { pageId },
            order: { createdAt: 'ASC' },
        });
        const userIds = [
            ...new Set([page.ownerId, ...members.map((m) => m.userId)]),
        ];
        const users = await this.userRepo.find({
            where: userIds.map((id) => ({ id })),
            select: ['id', 'firstName', 'lastName', 'username', 'profile_photo'],
        });
        const userById = new Map(users.map((u) => [u.id, u]));
        const rows = members.map((m) => ({
            userId: m.userId,
            role: m.role,
            joinedAt: m.createdAt,
        }));
        if (!rows.some((r) => r.userId === page.ownerId)) {
            rows.unshift({
                userId: page.ownerId,
                role: 'owner',
                joinedAt: page.createdAt,
            });
        }
        return rows
            .map((r) => {
            const u = userById.get(r.userId);
            return {
                ...r,
                isOwner: r.userId === page.ownerId,
                name: `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim(),
                username: u?.username ?? null,
                profile_photo: u?.profile_photo ?? null,
            };
        })
            .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
    }
    async changeMemberRole(pageId, targetUserId, newRole, requesterId) {
        if (!page_permissions_1.ASSIGNABLE_ROLES.includes(newRole)) {
            throw new common_1.BadRequestException('Role must be admin or editor');
        }
        const { page } = await this.requirePermission(pageId, requesterId, 'members.change_role', 'change roles');
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('The owner role cannot be changed');
        }
        const target = page.members.find((m) => m.userId === targetUserId);
        if (!target)
            throw new common_1.NotFoundException('Member not found');
        if (target.role === newRole) {
            throw new common_1.BadRequestException(`User is already ${newRole}`);
        }
        await this.memberRepo.update(target.id, { role: newRole });
        return {
            message: 'Member role updated successfully',
            data: { pageId, userId: targetUserId, role: newRole },
        };
    }
    async removeMember(pageId, targetUserId, requesterId) {
        if (targetUserId === requesterId) {
            return this.leavePage(pageId, requesterId);
        }
        const { page, role } = await this.requirePermission(pageId, requesterId, 'members.remove', 'remove members');
        if (targetUserId === page.ownerId) {
            throw new common_1.BadRequestException('The owner cannot be removed');
        }
        const target = page.members.find((m) => m.userId === targetUserId);
        if (!target)
            throw new common_1.NotFoundException('Member not found');
        if (role === 'admin' && target.role !== 'editor') {
            throw new common_1.ForbiddenException('An admin can remove editors only');
        }
        await this.memberRepo.delete(target.id);
        return { message: 'Member removed successfully' };
    }
    async leavePage(pageId, userId) {
        const page = await this.requirePage(pageId);
        if (page.ownerId === userId) {
            throw new common_1.BadRequestException('The owner cannot leave the page. Delete the page instead');
        }
        const me = page.members.find((m) => m.userId === userId);
        if (!me)
            throw new common_1.BadRequestException('You are not a member of this page');
        await this.memberRepo.delete(me.id);
        return { message: 'You left the page' };
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(1, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        page_verification_service_1.PageVerificationService])
], PagesService);
//# sourceMappingURL=pages.service.js.map