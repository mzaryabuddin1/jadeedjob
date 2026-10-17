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
exports.PageInvitationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const page_entity_1 = require("./entities/page.entity");
const page_member_entity_1 = require("./entities/page-member.entity");
const page_invitation_entity_1 = require("./entities/page-invitation.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_service_1 = require("../notification/notification.service");
const page_permissions_1 = require("./page-permissions");
const pages_service_1 = require("./pages.service");
const DAY_MS = 24 * 60 * 60 * 1000;
let PageInvitationsService = class PageInvitationsService {
    constructor(inviteRepo, memberRepo, pageRepo, userRepo, pagesService, notificationService) {
        this.inviteRepo = inviteRepo;
        this.memberRepo = memberRepo;
        this.pageRepo = pageRepo;
        this.userRepo = userRepo;
        this.pagesService = pagesService;
        this.notificationService = notificationService;
    }
    get validityDays() {
        return Number(process.env.PAGE_INVITATION_DAYS) || 7;
    }
    displayName(u) {
        return (`${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() ||
            u?.username ||
            'Someone');
    }
    async invite(pageId, requesterId, target, role) {
        if (!page_permissions_1.ASSIGNABLE_ROLES.includes(role)) {
            throw new common_1.BadRequestException('Role must be admin or editor');
        }
        const { page, role: myRole } = await this.pagesService.requirePermission(pageId, requesterId, 'members.invite', 'invite people');
        if (role === 'admin' && myRole !== 'owner') {
            throw new common_1.ForbiddenException('Only the owner can invite an admin');
        }
        const username = target.username
            ? String(target.username).trim().replace(/^@/, '').toLowerCase()
            : '';
        if (!target.userId && !username) {
            throw new common_1.BadRequestException('Send userId or username of the person');
        }
        const invitee = await this.userRepo.findOne({
            where: target.userId ? { id: Number(target.userId) } : { username },
            select: ['id', 'firstName', 'lastName', 'username', 'isBanned'],
        });
        if (!invitee || invitee.isBanned)
            throw new common_1.NotFoundException('User not found');
        if (invitee.id === requesterId) {
            throw new common_1.BadRequestException('You cannot invite yourself');
        }
        if (invitee.id === page.ownerId ||
            page.members.some((m) => m.userId === invitee.id)) {
            throw new common_1.BadRequestException('This user is already a member of the page');
        }
        const open = await this.inviteRepo.findOne({
            where: { pageId, invitedUserId: invitee.id, status: 'pending' },
        });
        if (open) {
            if (open.expiresAt.getTime() > Date.now()) {
                throw new common_1.BadRequestException('This user already has a pending invitation to this page');
            }
            await this.inviteRepo.update(open.id, { status: 'expired' });
        }
        const invitation = await this.inviteRepo.save(this.inviteRepo.create({
            pageId,
            invitedUserId: invitee.id,
            invitedBy: requesterId,
            role,
            status: 'pending',
            expiresAt: new Date(Date.now() + this.validityDays * DAY_MS),
        }));
        const inviter = await this.userRepo.findOne({
            where: { id: requesterId },
            select: ['id', 'firstName', 'lastName', 'username'],
        });
        const template = process.env.NOTIFICATION_PAGE_INVITATION_PATH || '/page-invitation/{id}';
        void this.notificationService.notifyUser(invitee.id, {
            title: 'Page invitation',
            body: `${this.displayName(inviter)} invited you to join "${page.page_name}" as ${role}`,
            data: {
                type: 'page_invitation',
                invitationId: invitation.id,
                pageId,
                pageName: page.page_name,
                role,
                inviterId: requesterId,
                inviterName: this.displayName(inviter),
                path: template.replace('{id}', String(invitation.id)),
            },
        });
        return {
            message: 'Invitation sent. The user must accept it to get access',
            data: this.toView(invitation, page, invitee, inviter),
        };
    }
    async listForPage(pageId, requesterId) {
        const { page } = await this.pagesService.requirePermission(pageId, requesterId, 'members.invite', 'see invitations');
        const invitations = await this.inviteRepo.find({
            where: { pageId, status: 'pending', expiresAt: (0, typeorm_2.MoreThan)(new Date()) },
            order: { createdAt: 'DESC' },
        });
        const users = await this.usersById(invitations.flatMap((i) => [i.invitedUserId, i.invitedBy]));
        return invitations.map((i) => this.toView(i, page, users.get(i.invitedUserId), users.get(i.invitedBy)));
    }
    async cancel(pageId, invitationId, requesterId) {
        const { role } = await this.pagesService.requirePermission(pageId, requesterId, 'members.invite', 'cancel invitations');
        const invitation = await this.inviteRepo.findOne({
            where: { id: invitationId, pageId },
        });
        if (!invitation)
            throw new common_1.NotFoundException('Invitation not found');
        if (invitation.status !== 'pending') {
            throw new common_1.BadRequestException(`Invitation is already ${invitation.status}`);
        }
        if (role === 'admin' && invitation.role !== 'editor') {
            throw new common_1.ForbiddenException('An admin can cancel editor invitations only');
        }
        await this.inviteRepo.update({ id: invitationId, status: 'pending' }, { status: 'cancelled', respondedAt: new Date() });
        return { message: 'Invitation cancelled' };
    }
    async listMine(userId) {
        const invitations = await this.inviteRepo.find({
            where: {
                invitedUserId: userId,
                status: 'pending',
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
            order: { createdAt: 'DESC' },
        });
        if (!invitations.length)
            return [];
        const pages = await this.pageRepo.find({
            where: { id: (0, typeorm_2.In)(invitations.map((i) => i.pageId)) },
        });
        const pageById = new Map(pages.map((p) => [p.id, p]));
        const users = await this.usersById(invitations.map((i) => i.invitedBy));
        return invitations
            .filter((i) => pageById.has(i.pageId))
            .map((i) => this.toView(i, pageById.get(i.pageId), undefined, users.get(i.invitedBy)));
    }
    async accept(invitationId, userId) {
        const invitation = await this.loadMine(invitationId, userId);
        const pageId = invitation.pageId;
        const result = await this.pageRepo.manager.transaction(async (manager) => {
            const page = await manager
                .createQueryBuilder(page_entity_1.Page, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :pageId', { pageId })
                .getOne();
            if (!page)
                throw new common_1.NotFoundException('This page no longer exists');
            const already = page.ownerId === userId ||
                (await manager.exists(page_member_entity_1.PageMember, { where: { pageId, userId } }));
            if (already)
                throw new common_1.BadRequestException('You are already a member');
            const claimed = await manager.update(page_invitation_entity_1.PageInvitation, { id: invitationId, status: 'pending' }, { status: 'accepted', respondedAt: new Date() });
            if (!claimed.affected) {
                throw new common_1.BadRequestException('This invitation was already answered');
            }
            await manager.save(manager.create(page_member_entity_1.PageMember, { pageId, userId, role: invitation.role }));
            return page;
        });
        const me = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'firstName', 'lastName', 'username'],
        });
        void this.notificationService.notifyUser(invitation.invitedBy, {
            title: 'Invitation accepted',
            body: `${this.displayName(me)} joined "${result.page_name}" as ${invitation.role}`,
            data: {
                type: 'page_invitation_accepted',
                pageId,
                pageName: result.page_name,
                userId,
                role: invitation.role,
                path: (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace('{id}', String(pageId)),
            },
        });
        return {
            message: `You now have ${invitation.role} access to "${result.page_name}"`,
            data: { pageId, role: invitation.role },
        };
    }
    async decline(invitationId, userId) {
        await this.loadMine(invitationId, userId);
        const res = await this.inviteRepo.update({ id: invitationId, status: 'pending' }, { status: 'declined', respondedAt: new Date() });
        if (!res.affected) {
            throw new common_1.BadRequestException('This invitation was already answered');
        }
        return { message: 'Invitation declined' };
    }
    async loadMine(invitationId, userId) {
        const invitation = await this.inviteRepo.findOne({
            where: { id: invitationId },
        });
        if (!invitation || invitation.invitedUserId !== userId) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (invitation.status !== 'pending') {
            throw new common_1.BadRequestException(`Invitation is already ${invitation.status}`);
        }
        if (invitation.expiresAt.getTime() <= Date.now()) {
            await this.inviteRepo.update(invitation.id, { status: 'expired' });
            throw new common_1.BadRequestException('This invitation has expired');
        }
        return invitation;
    }
    async usersById(ids) {
        const unique = [...new Set(ids)];
        const users = unique.length
            ? await this.userRepo.find({
                where: { id: (0, typeorm_2.In)(unique) },
                select: ['id', 'firstName', 'lastName', 'username', 'profile_photo'],
            })
            : [];
        return new Map(users.map((u) => [u.id, u]));
    }
    toView(i, page, invitee, inviter) {
        return {
            id: i.id,
            status: i.status,
            role: i.role,
            expiresAt: i.expiresAt,
            createdAt: i.createdAt,
            page: page
                ? {
                    id: page.id,
                    page_name: page.page_name,
                    username: page.username,
                    page_logo: page.page_logo,
                    is_verified: page.is_verified,
                }
                : undefined,
            invitedUser: invitee
                ? {
                    id: invitee.id,
                    name: this.displayName(invitee),
                    username: invitee.username,
                }
                : undefined,
            invitedBy: inviter
                ? {
                    id: inviter.id,
                    name: this.displayName(inviter),
                    username: inviter.username,
                }
                : undefined,
        };
    }
};
exports.PageInvitationsService = PageInvitationsService;
exports.PageInvitationsService = PageInvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(page_invitation_entity_1.PageInvitation)),
    __param(1, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(2, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        pages_service_1.PagesService,
        notification_service_1.NotificationService])
], PageInvitationsService);
//# sourceMappingURL=page-invitations.service.js.map