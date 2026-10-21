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
exports.ConversationsService = exports.personView = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_member_entity_1 = require("./entities/conversation-member.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const user_block_entity_1 = require("./entities/user-block.entity");
const user_entity_1 = require("../users/entities/user.entity");
const job_entity_1 = require("../job/entities/job.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const chat_events_service_1 = require("./chat-events.service");
const job_team_util_1 = require("./job-team.util");
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z');
const DM_DAILY_LIMIT = Math.max(1, Number(process.env.CHAT_DM_DAILY_LIMIT) || 30);
const personView = (u) => u
    ? {
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        username: u.username,
        profile_photo: u.profile_photo,
    }
    : null;
exports.personView = personView;
const VISIBLE = `(
  (c.type = 'direct' AND EXISTS (
     SELECT 1 FROM conversation_members vm WHERE vm.conversationId = c.id AND vm.userId = :me))
  OR (c.type = 'job' AND (
     c.createdBy = :me
     OR (j.id IS NOT NULL AND j.pageId IS NULL AND j.createdBy = :me)
     OR (j.id IS NOT NULL AND j.pageId IS NOT NULL AND (
          EXISTS (SELECT 1 FROM pages vp WHERE vp.id = j.pageId AND vp.ownerId = :me)
          OR EXISTS (SELECT 1 FROM page_members vpm
                     WHERE vpm.pageId = j.pageId AND vpm.userId = :me AND vpm.role IN (:...roles))))
  ))
)`;
let ConversationsService = class ConversationsService {
    constructor(convRepo, memberRepo, msgRepo, blockRepo, userRepo, jobRepo, pageRepo, appRepo, events) {
        this.convRepo = convRepo;
        this.memberRepo = memberRepo;
        this.msgRepo = msgRepo;
        this.blockRepo = blockRepo;
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.pageRepo = pageRepo;
        this.appRepo = appRepo;
        this.events = events;
    }
    async open(userId, dto) {
        const conv = await this.getOrCreate(userId, dto);
        return this.view(conv, userId);
    }
    async getOrCreate(userId, dto, opts = {}) {
        if (dto.type === 'direct')
            return this.getOrCreateDirect(userId, dto.userId);
        return this.getOrCreateJobChat(userId, dto.jobId, dto.userId, opts);
    }
    async getOrCreateDirect(userId, otherId) {
        const target = await this.userRepo.findOne({
            where: { id: otherId },
            select: ['id', 'isBanned'],
        });
        if (!target || target.isBanned)
            throw new common_1.NotFoundException('User not found');
        if (target.id === userId)
            throw new common_1.BadRequestException('You cannot message yourself');
        await this.assertNotBlocked(userId, target.id);
        const key = `d:${Math.min(userId, target.id)}:${Math.max(userId, target.id)}`;
        const existing = await this.convRepo.findOne({ where: { key } });
        if (existing)
            return existing;
        await this.assertDmQuota(userId);
        const conv = await this.insertConversation({ type: 'direct', key, createdBy: userId });
        await this.addMembers(conv.id, [userId, target.id]);
        return conv;
    }
    async getOrCreateJobChat(userId, jobId, withUserId, opts) {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            select: ['id', 'createdBy', 'pageId', 'isActive'],
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        const team = await (0, job_team_util_1.isJobTeam)(this.pageRepo, job, userId);
        let applicantId;
        if (team) {
            if (!withUserId) {
                throw new common_1.BadRequestException('Send userId: the applicant you want to contact about this job');
            }
            const person = await this.userRepo.findOne({
                where: { id: withUserId },
                select: ['id', 'isBanned'],
            });
            if (!person || person.isBanned)
                throw new common_1.NotFoundException('User not found');
            if (await (0, job_team_util_1.isJobTeam)(this.pageRepo, job, person.id)) {
                throw new common_1.BadRequestException('That person is on the employer side of this job');
            }
            applicantId = person.id;
        }
        else {
            if (withUserId && withUserId !== userId) {
                throw new common_1.BadRequestException('userId is only for the employer side of the job');
            }
            applicantId = userId;
        }
        const key = `j:${job.id}:${applicantId}`;
        const existing = await this.convRepo.findOne({ where: { key } });
        if (existing)
            return existing;
        if (team) {
            const applied = await this.appRepo.exist({ where: { jobId: job.id, applicantId } });
            if (!applied) {
                throw new common_1.ForbiddenException('You can only contact people who applied to this job');
            }
        }
        if (!team && !job.isActive && !opts.allowInactive) {
            throw new common_1.NotFoundException('Job not found or not active');
        }
        await this.assertCanContact(job, userId, applicantId, team);
        const conv = await this.insertConversation({
            type: 'job',
            key,
            createdBy: applicantId,
            jobId: job.id,
        });
        await this.addMembers(conv.id, [userId]);
        return conv;
    }
    async insertConversation(data) {
        try {
            return await this.convRepo.save(this.convRepo.create({ jobId: null, ...data }));
        }
        catch (err) {
            if (err?.code === 'ER_DUP_ENTRY') {
                return this.convRepo.findOneOrFail({ where: { key: data.key } });
            }
            throw err;
        }
    }
    async addMembers(conversationId, userIds) {
        await this.memberRepo
            .createQueryBuilder()
            .insert()
            .into(conversation_member_entity_1.ConversationMember)
            .values([...new Set(userIds)].map((userId) => ({ conversationId, userId })))
            .orIgnore()
            .execute();
    }
    async assertDmQuota(userId) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const n = await this.convRepo
            .createQueryBuilder('c')
            .where("c.type = 'direct' AND c.createdBy = :userId AND c.createdAt > :since", {
            userId,
            since,
        })
            .getCount();
        if (n >= DM_DAILY_LIMIT) {
            throw new common_1.ForbiddenException(`You can start at most ${DM_DAILY_LIMIT} new conversations a day`);
        }
    }
    async hasAccess(conv, userId) {
        if (conv.type === 'direct') {
            return this.memberRepo.exist({ where: { conversationId: conv.id, userId } });
        }
        if (conv.createdBy === userId)
            return true;
        const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
        return !!job && (await (0, job_team_util_1.isJobTeam)(this.pageRepo, job, userId));
    }
    async requireAccess(conversationId, userId) {
        const conv = await this.convRepo.findOne({ where: { id: conversationId } });
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
        if (!(await this.hasAccess(conv, userId))) {
            throw new common_1.ForbiddenException('You are not part of this chat');
        }
        let member = await this.memberRepo.findOne({ where: { conversationId, userId } });
        if (!member) {
            await this.addMembers(conversationId, [userId]);
            member = await this.memberRepo.findOneOrFail({ where: { conversationId, userId } });
        }
        return { conv, member };
    }
    async audience(conv) {
        if (conv.type === 'direct') {
            const rows = await this.memberRepo.find({
                where: { conversationId: conv.id },
                select: ['userId'],
            });
            return rows.map((r) => r.userId);
        }
        return [conv.createdBy, ...(await this.team(conv))];
    }
    async recipientsFor(conv, senderId) {
        if (conv.type === 'direct') {
            return (await this.audience(conv)).filter((id) => id !== senderId);
        }
        return senderId === conv.createdBy ? await this.team(conv) : [conv.createdBy];
    }
    async team(conv) {
        const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
        return job ? (0, job_team_util_1.jobTeamIds)(this.pageRepo, job) : [];
    }
    async blockedBetween(a, b) {
        const rows = await this.blockRepo.find({
            where: [
                { blockerId: a, blockedId: b },
                { blockerId: b, blockedId: a },
            ],
        });
        return {
            byMe: rows.some((r) => r.blockerId === a),
            byThem: rows.some((r) => r.blockerId === b),
        };
    }
    async assertNotBlocked(a, b) {
        const s = await this.blockedBetween(a, b);
        if (s.byMe || s.byThem) {
            throw new common_1.ForbiddenException('You cannot message this person');
        }
    }
    async assertCanContact(job, senderId, applicantId, senderIsTeam) {
        if (senderIsTeam)
            return this.assertNotBlocked(senderId, applicantId);
        if (!job.pageId)
            return this.assertNotBlocked(senderId, job.createdBy);
    }
    async assertCanSend(conv, senderId) {
        if (conv.type === 'direct') {
            for (const other of (await this.audience(conv)).filter((id) => id !== senderId)) {
                await this.assertNotBlocked(senderId, other);
            }
            return;
        }
        const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
        if (!job)
            return;
        const senderIsTeam = senderId !== conv.createdBy;
        await this.assertCanContact(job, senderId, conv.createdBy, senderIsTeam);
    }
    async block(userId, targetId) {
        if (userId === targetId)
            throw new common_1.BadRequestException('You cannot block yourself');
        if (!(await this.userRepo.exist({ where: { id: targetId } }))) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.blockRepo
            .createQueryBuilder()
            .insert()
            .into(user_block_entity_1.UserBlock)
            .values({ blockerId: userId, blockedId: targetId })
            .orIgnore()
            .execute();
        return { blocked: true };
    }
    async unblock(userId, targetId) {
        await this.blockRepo.delete({ blockerId: userId, blockedId: targetId });
        return { blocked: false };
    }
    async listBlocks(userId) {
        const rows = await this.blockRepo.find({
            where: { blockerId: userId },
            order: { id: 'DESC' },
        });
        const users = await this.usersById(rows.map((r) => r.blockedId));
        return rows.map((r) => ({
            ...(0, exports.personView)(users.get(r.blockedId)),
            id: r.blockedId,
            blockedAt: r.createdAt,
        }));
    }
    async list(userId, opts) {
        const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
        const page = Math.max(1, Number(opts.page) || 1);
        const [rows, total] = await this.convRepo
            .createQueryBuilder('c')
            .leftJoin(job_entity_1.Job, 'j', 'j.id = c.jobId')
            .where('c.lastMessageId IS NOT NULL')
            .andWhere(VISIBLE, { me: userId, roles: job_team_util_1.JOB_TEAM_ROLES })
            .orderBy('c.lastMessageAt', 'DESC')
            .addOrderBy('c.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return {
            data: await this.views(rows, userId),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async view(conv, userId) {
        return (await this.views([conv], userId))[0];
    }
    async get(userId, conversationId) {
        const { conv } = await this.requireAccess(conversationId, userId);
        return this.view(conv, userId);
    }
    async views(convs, userId) {
        if (!convs.length)
            return [];
        const ids = convs.map((c) => c.id);
        const [members, lastMessages, unread, jobs] = await Promise.all([
            this.memberRepo.find({ where: { conversationId: (0, typeorm_2.In)(ids) } }),
            this.msgRepo.find({
                where: { id: (0, typeorm_2.In)(convs.map((c) => c.lastMessageId).filter(Boolean)) },
            }),
            this.unreadByConversation(userId, ids),
            this.jobRepo.find({
                where: { id: (0, typeorm_2.In)(convs.map((c) => c.jobId).filter(Boolean)) },
                relations: ['page'],
            }),
        ]);
        const userIds = new Set();
        members.forEach((m) => userIds.add(m.userId));
        convs.forEach((c) => userIds.add(c.createdBy));
        jobs.forEach((j) => userIds.add(j.createdBy));
        const users = await this.usersById([...userIds]);
        const jobById = new Map(jobs.map((j) => [j.id, j]));
        const lastById = new Map(lastMessages.map((m) => [m.id, m]));
        return Promise.all(convs.map(async (c) => {
            const mine = members.find((m) => m.conversationId === c.id && m.userId === userId);
            const job = c.jobId ? jobById.get(c.jobId) : null;
            const asApplicant = c.type === 'job' && c.createdBy === userId;
            let other = null;
            let otherUserId;
            if (c.type === 'direct') {
                otherUserId = members.find((m) => m.conversationId === c.id && m.userId !== userId)?.userId;
                other = otherUserId ? { ...(0, exports.personView)(users.get(otherUserId)), kind: 'user' } : null;
            }
            else if (!asApplicant) {
                otherUserId = c.createdBy;
                other = { ...(0, exports.personView)(users.get(c.createdBy)), kind: 'user' };
            }
            else if (job?.page) {
                other = {
                    id: job.page.id,
                    name: job.page.page_name,
                    username: job.page.username,
                    profile_photo: job.page.page_logo,
                    kind: 'page',
                };
            }
            else if (job) {
                otherUserId = job.createdBy;
                other = { ...(0, exports.personView)(users.get(job.createdBy)), kind: 'user' };
            }
            const blocked = otherUserId
                ? await this.blockedBetween(userId, otherUserId)
                : { byMe: false, byThem: false };
            const last = c.lastMessageId ? lastById.get(c.lastMessageId) : null;
            return {
                id: c.id,
                type: c.type,
                role: c.type === 'job' ? (asApplicant ? 'applicant' : 'employer') : null,
                job: job
                    ? {
                        id: job.id,
                        title: job.title,
                        isActive: job.isActive,
                        page: job.page
                            ? {
                                id: job.page.id,
                                page_name: job.page.page_name,
                                page_logo: job.page.page_logo,
                                is_verified: !!job.page.is_verified,
                            }
                            : null,
                    }
                    : null,
                other,
                lastMessage: last
                    ? {
                        id: last.id,
                        senderId: last.senderId,
                        messageType: last.messageType,
                        content: last.deletedAt ? null : last.content,
                        mediaUrl: last.deletedAt ? null : last.mediaUrl,
                        deleted: !!last.deletedAt,
                        createdAt: last.createdAt,
                    }
                    : null,
                unreadCount: unread.get(c.id) ?? 0,
                muted: !!mine?.mutedUntil && mine.mutedUntil > new Date(),
                mutedUntil: mine?.mutedUntil ?? null,
                blocked,
                createdAt: c.createdAt,
                lastMessageAt: c.lastMessageAt,
            };
        }));
    }
    async unreadByConversation(userId, ids) {
        const rows = await this.msgRepo
            .createQueryBuilder('msg')
            .leftJoin(conversation_member_entity_1.ConversationMember, 'cm', 'cm.conversationId = msg.conversationId AND cm.userId = :userId', { userId })
            .select('msg.conversationId', 'conversationId')
            .addSelect('COUNT(*)', 'n')
            .where('msg.conversationId IN (:...ids)', { ids })
            .andWhere('msg.senderId <> :userId AND msg.deletedAt IS NULL')
            .andWhere('msg.id > COALESCE(cm.lastReadMessageId, 0)')
            .groupBy('msg.conversationId')
            .getRawMany();
        return new Map(rows.map((r) => [Number(r.conversationId), Number(r.n)]));
    }
    async unreadTotal(userId) {
        const row = await this.msgRepo
            .createQueryBuilder('msg')
            .innerJoin(conversation_entity_1.Conversation, 'c', 'c.id = msg.conversationId')
            .leftJoin(job_entity_1.Job, 'j', 'j.id = c.jobId')
            .leftJoin(conversation_member_entity_1.ConversationMember, 'cm', 'cm.conversationId = msg.conversationId AND cm.userId = :me')
            .select('COUNT(*)', 'n')
            .addSelect('COUNT(DISTINCT msg.conversationId)', 'conversations')
            .where('msg.senderId <> :me AND msg.deletedAt IS NULL')
            .andWhere('msg.id > COALESCE(cm.lastReadMessageId, 0)')
            .andWhere(VISIBLE)
            .setParameters({ me: userId, roles: job_team_util_1.JOB_TEAM_ROLES })
            .getRawOne();
        return {
            unreadMessages: Number(row?.n ?? 0),
            unreadConversations: Number(row?.conversations ?? 0),
        };
    }
    async markRead(userId, conversationId, messageId) {
        const { conv, member } = await this.requireAccess(conversationId, userId);
        const upTo = Math.min(messageId ?? conv.lastMessageId ?? 0, conv.lastMessageId ?? 0);
        if (upTo > member.lastReadMessageId) {
            await this.memberRepo.update(member.id, { lastReadMessageId: upTo });
            this.events.emitToUsers(await this.audience(conv), 'conversation:read', {
                conversationId: conv.id,
                userId,
                lastReadMessageId: upTo,
            });
        }
        return { conversationId: conv.id, lastReadMessageId: Math.max(upTo, member.lastReadMessageId) };
    }
    async mute(userId, conversationId, muted, hours) {
        const { member } = await this.requireAccess(conversationId, userId);
        const until = !muted
            ? null
            : hours
                ? new Date(Date.now() + hours * 60 * 60 * 1000)
                : FAR_FUTURE;
        await this.memberRepo.update(member.id, { mutedUntil: until });
        return { muted, mutedUntil: until };
    }
    async usersById(ids) {
        const unique = [...new Set(ids)];
        if (!unique.length)
            return new Map();
        const users = await this.userRepo.find({
            where: { id: (0, typeorm_2.In)(unique) },
            select: ['id', 'firstName', 'lastName', 'username', 'profile_photo'],
        });
        return new Map(users.map((u) => [u.id, u]));
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(1, (0, typeorm_1.InjectRepository)(conversation_member_entity_1.ConversationMember)),
    __param(2, (0, typeorm_1.InjectRepository)(conversation_message_entity_1.ConversationMessage)),
    __param(3, (0, typeorm_1.InjectRepository)(user_block_entity_1.UserBlock)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(5, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(6, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(7, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        chat_events_service_1.ChatEvents])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map