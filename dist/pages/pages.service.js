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
const company_branch_entity_1 = require("./entities/company-branch.entity");
const EMPLOYER_PERMISSION_KEYS = [
    'postJobs',
    'editJobs',
    'viewApplicants',
    'chatApplicants',
    'manageTeam',
];
const FULL_EMPLOYER_PERMISSIONS = {
    postJobs: true,
    editJobs: true,
    viewApplicants: true,
    chatApplicants: true,
    manageTeam: true,
};
let PagesService = class PagesService {
    constructor(pageRepo, memberRepo, userRepo, branchRepo) {
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.userRepo = userRepo;
        this.branchRepo = branchRepo;
    }
    getDefaultPermissions(role) {
        if (role === 'editor') {
            return {
                postJobs: true,
                editJobs: true,
                viewApplicants: true,
                chatApplicants: true,
                manageTeam: false,
            };
        }
        return { ...FULL_EMPLOYER_PERMISSIONS };
    }
    normalizePermissions(role, permissions) {
        const normalized = this.getDefaultPermissions(role);
        for (const key of EMPLOYER_PERMISSION_KEYS) {
            if (typeof permissions?.[key] === 'boolean') {
                normalized[key] = permissions[key];
            }
        }
        if (role === 'owner') {
            return { ...FULL_EMPLOYER_PERMISSIONS };
        }
        return normalized;
    }
    memberForUser(page, userId) {
        if (page.ownerId === userId) {
            return {
                id: page.members?.find((member) => member.userId === userId)?.id ?? null,
                userId,
                role: 'owner',
                hasAccess: true,
                permissions: FULL_EMPLOYER_PERMISSIONS,
            };
        }
        return page.members?.find((member) => member.userId === userId) ?? null;
    }
    async getPageForEmployerAccess(companyId, userId, permission) {
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['members', 'members.user', 'branches'],
        });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        const member = this.memberForUser(page, userId);
        if (!member || member.hasAccess === false) {
            throw new common_1.ForbiddenException('You do not have access to this company');
        }
        const permissions = this.normalizePermissions(member.role, member.permissions);
        if (permission && !permissions[permission]) {
            throw new common_1.ForbiddenException('You do not have permission for this action');
        }
        return { page, member, permissions };
    }
    formatBranch(branch) {
        if (!branch)
            return null;
        return {
            id: branch.id,
            label: branch.label,
            address: branch.address,
            lat: branch.lat,
            lng: branch.lng,
            location: branch.lat === null || branch.lng === null
                ? null
                : {
                    lat: Number(branch.lat),
                    lng: Number(branch.lng),
                },
        };
    }
    formatCompany(page) {
        return {
            id: page.id,
            name: page.company_name,
            companyName: page.company_name,
            businessName: page.business_name,
            logoUrl: page.company_logo,
            description: page.company_description,
            website: page.website_url,
            email: page.official_email,
            phone: page.official_phone,
            industry: page.industry_type,
            country: page.country,
            state: page.state,
            city: page.city,
            address_line1: page.address_line1,
            address_line2: page.address_line2,
            socials: {
                linkedin: page.linkedin_page_url,
                facebook: page.facebook_page_url,
                instagram: page.instagram_page_url,
                twitter: page.twitter_page_url,
                youtube: page.youtube_channel_url,
            },
            branches: (page.branches || []).map((branch) => this.formatBranch(branch)),
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
        };
    }
    formatMember(member, page) {
        const role = member.role || 'editor';
        const permissions = this.normalizePermissions(role, member.permissions);
        const user = member.user;
        const name = user?.full_name ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
        return {
            id: member.id,
            companyId: member.pageId ?? page?.id,
            userId: member.userId,
            name: name || '',
            phone: user?.phone || '',
            avatarUrl: user?.profile_photo || null,
            roleType: role,
            roleLabel: role.charAt(0).toUpperCase() + role.slice(1),
            hasAccess: member.hasAccess !== false,
            permissions,
        };
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
    async getEmployerAccounts(userId) {
        const pages = await this.pageRepo
            .createQueryBuilder('page')
            .leftJoinAndSelect('page.members', 'member')
            .leftJoinAndSelect('page.branches', 'branch')
            .where('page.ownerId = :userId', { userId })
            .orWhere('member.userId = :userId', { userId })
            .orderBy('page.createdAt', 'DESC')
            .getMany();
        const individual = {
            id: 'individual',
            companyId: null,
            companyName: 'Personal / Individual',
            roleType: 'owner',
            branchId: null,
            branchLocation: null,
            logoUrl: null,
            postingMode: 'individual',
            permissions: { ...FULL_EMPLOYER_PERMISSIONS },
        };
        const companyAccounts = pages.map((page) => {
            const member = this.memberForUser(page, userId);
            const role = member?.role || 'owner';
            const branch = page.branches?.[0] || null;
            return {
                id: `company:${page.id}`,
                companyId: page.id,
                companyName: page.company_name,
                roleType: role,
                branchId: branch?.id || null,
                branchLocation: branch
                    ? {
                        label: branch.label,
                        address: branch.address,
                        lat: branch.lat,
                        lng: branch.lng,
                    }
                    : null,
                logoUrl: page.company_logo || null,
                postingMode: 'company',
                permissions: this.normalizePermissions(role, member?.permissions),
            };
        });
        return { data: [individual, ...companyAccounts] };
    }
    async getEmployerCompanySelectOptions(userId) {
        const accounts = await this.getEmployerAccounts(userId);
        return {
            data: accounts.data.map((account) => ({
                id: account.companyId,
                label: account.companyName,
                logoUrl: account.logoUrl,
                postingMode: account.postingMode,
                permissions: account.permissions,
            })),
        };
    }
    async getEmployerCompany(companyId, userId) {
        const { page, member, permissions } = await this.getPageForEmployerAccess(companyId, userId);
        return {
            data: {
                ...this.formatCompany(page),
                myRole: member.role,
                myPermissions: permissions,
            },
        };
    }
    async updateEmployerCompany(companyId, userId, data) {
        await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        const patch = this.mapEmployerCompanyPatch(data);
        await this.pageRepo.update(companyId, patch);
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['branches'],
        });
        return {
            message: 'Company updated successfully',
            data: this.formatCompany(page),
        };
    }
    async createBranch(companyId, userId, data) {
        await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        const branch = await this.branchRepo.save(this.branchRepo.create({
            companyId,
            label: data.label,
            address: data.address || data.location || null,
            lat: data.lat ?? data.location?.lat ?? null,
            lng: data.lng ?? data.location?.lng ?? null,
        }));
        return {
            message: 'Branch created successfully',
            data: this.formatBranch(branch),
        };
    }
    async updateBranch(companyId, branchId, userId, data) {
        await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        const branch = await this.branchRepo.findOne({
            where: { id: branchId, companyId },
        });
        if (!branch)
            throw new common_1.NotFoundException('Branch not found');
        if (data.label !== undefined)
            branch.label = data.label;
        if (data.address !== undefined || data.location !== undefined) {
            branch.address = data.address ?? data.location ?? branch.address;
        }
        if (data.lat !== undefined || data.location?.lat !== undefined) {
            branch.lat = data.lat ?? data.location.lat;
        }
        if (data.lng !== undefined || data.location?.lng !== undefined) {
            branch.lng = data.lng ?? data.location.lng;
        }
        await this.branchRepo.save(branch);
        return {
            message: 'Branch updated successfully',
            data: this.formatBranch(branch),
        };
    }
    async deleteBranch(companyId, branchId, userId) {
        await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        const result = await this.branchRepo.delete({ id: branchId, companyId });
        if (!result.affected)
            throw new common_1.NotFoundException('Branch not found');
        return { message: 'Branch deleted successfully' };
    }
    async getCompanyTeam(companyId, userId) {
        const { page } = await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        return {
            data: (page.members || []).map((member) => this.formatMember(member, page)),
        };
    }
    async inviteOrGrantCompanyTeamMember(companyId, userId, data) {
        await this.getPageForEmployerAccess(companyId, userId, 'manageTeam');
        let target = null;
        if (data.userId) {
            target = await this.userRepo.findOne({ where: { id: Number(data.userId) } });
        }
        else if (data.phone) {
            target = await this.userRepo.findOne({ where: { phone: data.phone } });
        }
        if (!target)
            throw new common_1.BadRequestException('User not found');
        const role = data.roleType || data.role || 'editor';
        if (!['admin', 'editor'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const page = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['members'],
        });
        if (!page)
            throw new common_1.NotFoundException('Company not found');
        if (target.id === page.ownerId)
            throw new common_1.BadRequestException('User is owner');
        let member = page.members.find((item) => item.userId === target.id);
        if (member) {
            member.role = role;
            member.hasAccess = data.hasAccess !== false;
            member.permissions = this.normalizePermissions(role, data.permissions);
        }
        else {
            member = this.memberRepo.create({
                pageId: companyId,
                userId: target.id,
                role,
                hasAccess: data.hasAccess !== false,
                permissions: this.normalizePermissions(role, data.permissions),
            });
        }
        const saved = await this.memberRepo.save(member);
        saved.user = target;
        return {
            message: 'Team member access saved successfully',
            data: this.formatMember(saved, page),
        };
    }
    async updateCompanyTeamAccess(memberId, userId, hasAccess) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId },
            relations: ['page', 'page.members', 'user'],
        });
        if (!member)
            throw new common_1.NotFoundException('Team member not found');
        await this.getPageForEmployerAccess(member.pageId, userId, 'manageTeam');
        if (member.role === 'owner') {
            throw new common_1.BadRequestException('Owner access cannot be changed');
        }
        member.hasAccess = hasAccess;
        const saved = await this.memberRepo.save(member);
        return {
            message: 'Team member access updated successfully',
            data: this.formatMember(saved, member.page),
        };
    }
    async updateCompanyTeamPermissions(memberId, userId, permissions) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId },
            relations: ['page', 'page.members', 'user'],
        });
        if (!member)
            throw new common_1.NotFoundException('Team member not found');
        await this.getPageForEmployerAccess(member.pageId, userId, 'manageTeam');
        if (member.role === 'owner') {
            throw new common_1.BadRequestException('Owner permissions cannot be changed');
        }
        member.permissions = this.normalizePermissions(member.role, permissions);
        const saved = await this.memberRepo.save(member);
        return {
            message: 'Team member permissions updated successfully',
            data: this.formatMember(saved, member.page),
        };
    }
    async userHasCompanyPermission(companyId, userId, permission) {
        await this.getPageForEmployerAccess(companyId, userId, permission);
        return true;
    }
    mapEmployerCompanyPatch(data) {
        const patch = { ...data };
        if (data.name !== undefined)
            patch.company_name = data.name;
        if (data.logoUrl !== undefined)
            patch.company_logo = data.logoUrl;
        if (data.description !== undefined)
            patch.company_description = data.description;
        if (data.website !== undefined)
            patch.website_url = data.website;
        if (data.socials) {
            patch.linkedin_page_url = data.socials.linkedin ?? patch.linkedin_page_url;
            patch.facebook_page_url = data.socials.facebook ?? patch.facebook_page_url;
            patch.instagram_page_url = data.socials.instagram ?? patch.instagram_page_url;
            patch.twitter_page_url = data.socials.twitter ?? patch.twitter_page_url;
            patch.youtube_channel_url = data.socials.youtube ?? patch.youtube_channel_url;
            delete patch.socials;
        }
        delete patch.id;
        delete patch.companyId;
        delete patch.name;
        delete patch.logoUrl;
        delete patch.description;
        delete patch.website;
        return patch;
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(1, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(company_branch_entity_1.CompanyBranch)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PagesService);
//# sourceMappingURL=pages.service.js.map