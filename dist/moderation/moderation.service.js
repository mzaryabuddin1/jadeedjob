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
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const api_exception_1 = require("../common/errors/api-exception");
const chat_message_entity_1 = require("../chat/entities/chat-message.entity");
const job_entity_1 = require("../job/entities/job.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const community_post_entity_1 = require("../posts/entities/community-post.entity");
const post_comment_entity_1 = require("../posts/entities/post-comment.entity");
const profile_block_entity_1 = require("../profiles/entities/profile-block.entity");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const profile_format_util_1 = require("../profiles/profile-format.util");
const reel_comment_entity_1 = require("../reels/entities/reel-comment.entity");
const reel_creator_follow_entity_1 = require("../reels/entities/reel-creator-follow.entity");
const reel_report_entity_1 = require("../reels/entities/reel-report.entity");
const reel_entity_1 = require("../reels/entities/reel.entity");
const user_entity_1 = require("../users/entities/user.entity");
const moderation_audit_entity_1 = require("./entities/moderation-audit.entity");
const moderation_report_entity_1 = require("./entities/moderation-report.entity");
let ModerationService = class ModerationService {
    constructor(blockRepo, followRepo, legacyFollowRepo, userRepo, companyRepo, pageMemberRepo, reelRepo, reelCommentRepo, legacyReelReportRepo, postRepo, postCommentRepo, chatMessageRepo, jobRepo, reportRepo, auditRepo, notificationsService) {
        this.blockRepo = blockRepo;
        this.followRepo = followRepo;
        this.legacyFollowRepo = legacyFollowRepo;
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.pageMemberRepo = pageMemberRepo;
        this.reelRepo = reelRepo;
        this.reelCommentRepo = reelCommentRepo;
        this.legacyReelReportRepo = legacyReelReportRepo;
        this.postRepo = postRepo;
        this.postCommentRepo = postCommentRepo;
        this.chatMessageRepo = chatMessageRepo;
        this.jobRepo = jobRepo;
        this.reportRepo = reportRepo;
        this.auditRepo = auditRepo;
        this.notificationsService = notificationsService;
    }
    parseProfileType(value) {
        if (value !== 'user' && value !== 'company') {
            throw new common_1.BadRequestException('Invalid profile type');
        }
        return value;
    }
    async block(blockerUserId, profileTypeValue, profileId) {
        const profileType = this.parseProfileType(profileTypeValue);
        await this.assertTargetExists(profileType, profileId);
        if (profileType === 'user' && blockerUserId === profileId) {
            throw new common_1.BadRequestException('You cannot block yourself');
        }
        await this.blockRepo.manager.transaction(async (manager) => {
            await manager
                .getRepository(profile_block_entity_1.ProfileBlock)
                .createQueryBuilder()
                .insert()
                .values({ blockerUserId, profileType, profileId })
                .orIgnore()
                .execute();
            const follows = manager.getRepository(profile_follow_entity_1.ProfileFollow);
            await follows.delete({ followerUserId: blockerUserId, profileType, profileId });
            if (profileType === 'user') {
                await follows.delete({
                    followerUserId: profileId,
                    profileType: 'user',
                    profileId: blockerUserId,
                });
                const legacy = manager.getRepository(reel_creator_follow_entity_1.ReelCreatorFollow);
                await legacy.delete([
                    { followerId: blockerUserId, creatorId: profileId },
                    { followerId: profileId, creatorId: blockerUserId },
                ]);
            }
        });
        return { profileType, profileId: String(profileId), blocked: true };
    }
    async unblock(blockerUserId, profileTypeValue, profileId) {
        const profileType = this.parseProfileType(profileTypeValue);
        await this.blockRepo.delete({ blockerUserId, profileType, profileId });
        return { profileType, profileId: String(profileId), blocked: false };
    }
    async listBlocked(userId, page = 1, limit = 20) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [blocks, total] = await this.blockRepo.findAndCount({
            where: { blockerUserId: userId },
            order: { createdAt: 'DESC' },
            skip: (currentPage - 1) * take,
            take,
        });
        const userIds = blocks
            .filter((item) => item.profileType === 'user')
            .map((item) => item.profileId);
        const companyIds = blocks
            .filter((item) => item.profileType === 'company')
            .map((item) => item.profileId);
        const [users, companies] = await Promise.all([
            userIds.length ? this.userRepo.findBy({ id: (0, typeorm_2.In)(userIds) }) : [],
            companyIds.length ? this.companyRepo.findBy({ id: (0, typeorm_2.In)(companyIds) }) : [],
        ]);
        const userMap = new Map(users.map((item) => [item.id, item]));
        const companyMap = new Map(companies.map((item) => [item.id, item]));
        return {
            data: blocks
                .map((item) => {
                const target = item.profileType === 'user'
                    ? userMap.get(item.profileId)
                    : companyMap.get(item.profileId);
                if (!target)
                    return null;
                return {
                    ...(item.profileType === 'user'
                        ? (0, profile_format_util_1.formatUserPublisher)(target)
                        : (0, profile_format_util_1.formatCompanyPublisher)(target)),
                    blockedAt: item.createdAt,
                };
            })
                .filter(Boolean),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async isInteractionBlocked(viewerId, targetType, targetId) {
        const direct = await this.blockRepo.findOne({
            where: { blockerUserId: viewerId, profileType: targetType, profileId: targetId },
        });
        if (direct)
            return true;
        if (targetType !== 'user')
            return false;
        return Boolean(await this.blockRepo.findOne({
            where: {
                blockerUserId: targetId,
                profileType: 'user',
                profileId: viewerId,
            },
        }));
    }
    async assertInteractionAllowed(viewerId, targetType, targetId) {
        if (await this.isInteractionBlocked(viewerId, targetType, targetId)) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.FORBIDDEN, 'PROFILE_BLOCKED', 'This action is unavailable because of a blocked relationship');
        }
    }
    async blockedTargets(userId) {
        const [own, reverse] = await Promise.all([
            this.blockRepo.find({ where: { blockerUserId: userId } }),
            this.blockRepo.find({ where: { profileType: 'user', profileId: userId } }),
        ]);
        return {
            userIds: [
                ...new Set([
                    ...own
                        .filter((item) => item.profileType === 'user')
                        .map((item) => item.profileId),
                    ...reverse.map((item) => item.blockerUserId),
                ]),
            ],
            companyIds: [
                ...new Set(own
                    .filter((item) => item.profileType === 'company')
                    .map((item) => item.profileId)),
            ],
        };
    }
    async reportPost(postId, reporterUserId, body) {
        const post = await this.postRepo.findOne({
            where: { id: postId },
            relations: ['creator', 'publisherCompany'],
        });
        if (!this.postVisible(post))
            throw new common_1.NotFoundException('Post not found');
        await this.assertPublisherReportable(reporterUserId, post.publisherType, post.creatorId, post.publisherCompanyId);
        try {
            return await this.createReport(reporterUserId, body, {
                targetType: 'post',
                targetId: String(post.id),
                targetOwnerUserId: post.creatorId,
                targetCompanyId: post.publisherCompanyId,
                snapshot: {
                    postId: String(post.id),
                    publisherType: post.publisherType,
                    publisherCompanyId: post.publisherCompanyId
                        ? String(post.publisherCompanyId)
                        : null,
                    body: post.body,
                    mediaType: post.mediaType,
                },
            });
        }
        catch (error) {
            const response = error instanceof api_exception_1.ApiException ? error.getResponse() : null;
            if (response?.code === 'MODERATION_REPORT_DUPLICATE') {
                throw new common_1.BadRequestException('Post already reported');
            }
            throw error;
        }
    }
    async reportPostComment(postId, commentId, reporterUserId, body) {
        const comment = await this.postCommentRepo.findOne({
            where: { id: commentId, postId },
            relations: ['post', 'post.creator', 'post.publisherCompany', 'user'],
        });
        if (!comment ||
            comment.deletedAt ||
            (comment.moderationStatus && comment.moderationStatus !== 'visible')) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (!this.postVisible(comment.post))
            throw new common_1.NotFoundException('Post not found');
        await this.assertInteractionAllowed(reporterUserId, 'user', comment.userId);
        return this.createReport(reporterUserId, body, {
            targetType: 'post_comment',
            targetId: String(comment.id),
            targetOwnerUserId: comment.userId,
            targetCompanyId: comment.post.publisherCompanyId,
            snapshot: {
                postId: String(postId),
                commentId: String(comment.id),
                text: comment.text,
            },
        });
    }
    async reportReel(reelId, reporterUserId, body) {
        const reel = await this.reelRepo.findOne({
            where: { id: reelId },
            relations: ['creator', 'publisherCompany'],
        });
        if (!this.reelVisible(reel))
            throw new common_1.NotFoundException('Reel not found');
        await this.assertPublisherReportable(reporterUserId, reel.publisherType, reel.creatorId, reel.publisherCompanyId);
        return this.createReport(reporterUserId, body, {
            targetType: 'reel',
            targetId: String(reel.id),
            targetOwnerUserId: reel.creatorId,
            targetCompanyId: reel.publisherCompanyId,
            snapshot: {
                reelId: String(reel.id),
                publisherType: reel.publisherType,
                publisherCompanyId: reel.publisherCompanyId
                    ? String(reel.publisherCompanyId)
                    : null,
                caption: reel.caption,
            },
        });
    }
    async reportReelComment(reelId, commentId, reporterUserId, body) {
        const comment = await this.reelCommentRepo.findOne({
            where: { id: commentId, reelId },
            relations: ['reel', 'reel.creator', 'reel.publisherCompany', 'user'],
        });
        if (!comment ||
            comment.deletedAt ||
            (comment.moderationStatus && comment.moderationStatus !== 'visible')) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (!this.reelVisible(comment.reel))
            throw new common_1.NotFoundException('Reel not found');
        await this.assertInteractionAllowed(reporterUserId, 'user', comment.userId);
        return this.createReport(reporterUserId, body, {
            targetType: 'reel_comment',
            targetId: String(comment.id),
            targetOwnerUserId: comment.userId,
            targetCompanyId: comment.reel.publisherCompanyId,
            snapshot: {
                reelId: String(reelId),
                commentId: String(comment.id),
                text: comment.text,
            },
        });
    }
    async reportProfile(profileTypeValue, profileId, reporterUserId, body) {
        const profileType = this.parseProfileType(profileTypeValue);
        await this.assertInteractionAllowed(reporterUserId, profileType, profileId);
        if (profileType === 'user') {
            const user = await this.userRepo.findOne({ where: { id: profileId } });
            if (!user || user.isBanned || user.deletedAt) {
                throw new common_1.NotFoundException('Profile not found');
            }
            return this.createReport(reporterUserId, body, {
                targetType: 'user',
                targetId: String(user.id),
                targetOwnerUserId: user.id,
                snapshot: { profileType: 'user', profileId: String(user.id) },
            });
        }
        const company = await this.companyRepo.findOne({ where: { id: profileId } });
        if (!company || company.verificationStatus !== 'approved') {
            throw new common_1.NotFoundException('Profile not found');
        }
        if (await this.userHasCompanyAccess(reporterUserId, company)) {
            throw new common_1.BadRequestException('You cannot report your own profile');
        }
        return this.createReport(reporterUserId, body, {
            targetType: 'company',
            targetId: String(company.id),
            targetOwnerUserId: company.ownerId,
            targetCompanyId: company.id,
            snapshot: {
                profileType: 'company',
                profileId: String(company.id),
                name: company.company_name,
            },
        });
    }
    async reportJob(jobId, reporterUserId, body) {
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: ['creator', 'page'],
        });
        if (!job ||
            !job.isActive ||
            job.status !== 'active' ||
            (job.moderationStatus && job.moderationStatus !== 'visible') ||
            job.creator?.isBanned ||
            job.creator?.deletedAt ||
            (job.pageId && job.page?.verificationStatus !== 'approved')) {
            throw new common_1.NotFoundException('Job not found');
        }
        await this.assertPublisherReportable(reporterUserId, job.pageId ? 'company' : 'user', job.createdBy, job.pageId);
        return this.createReport(reporterUserId, body, {
            targetType: 'job',
            targetId: String(job.id),
            targetOwnerUserId: job.createdBy,
            targetCompanyId: job.pageId,
            snapshot: {
                jobId: String(job.id),
                title: job.title,
                companyId: job.pageId ? String(job.pageId) : null,
            },
        });
    }
    async reportResolvedTarget(reporterUserId, body, target) {
        if (target.targetOwnerUserId === reporterUserId) {
            throw new common_1.BadRequestException('You cannot report your own content');
        }
        return this.createReport(reporterUserId, body, target);
    }
    async listReports(query) {
        const currentPage = Math.max(1, Number(query.page) || 1);
        const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const qb = this.reportRepo
            .createQueryBuilder('report')
            .orderBy('report.createdAt', 'DESC')
            .addOrderBy('report.id', 'DESC')
            .skip((currentPage - 1) * take)
            .take(take);
        if (query.status && query.status !== 'all') {
            qb.andWhere('report.status = :status', { status: query.status });
        }
        if (query.targetType) {
            qb.andWhere('report.targetType = :targetType', {
                targetType: query.targetType,
            });
        }
        const [data, total] = await qb.getManyAndCount();
        return {
            data: data.map((item) => this.formatReport(item)),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async getReport(reportId) {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report)
            throw new common_1.NotFoundException('Moderation report not found');
        const audits = await this.auditRepo.find({
            where: { reportId },
            order: { createdAt: 'ASC', id: 'ASC' },
        });
        return {
            report: this.formatReport(report),
            audits: audits.map((audit) => ({
                id: String(audit.id),
                event: audit.event,
                actorUserId: audit.actorUserId ? String(audit.actorUserId) : null,
                notes: audit.notes,
                metadata: audit.metadata || {},
                createdAt: audit.createdAt,
            })),
        };
    }
    async resolveReport(reportId, adminId, body) {
        const suspensionEndsAt = body.suspensionEndsAt
            ? new Date(body.suspensionEndsAt)
            : null;
        const report = await this.reportRepo.manager.transaction(async (manager) => {
            const current = await manager.getRepository(moderation_report_entity_1.ModerationReport).findOne({
                where: { id: reportId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!current)
                throw new common_1.NotFoundException('Moderation report not found');
            if (current.status !== 'pending') {
                if (current.action === body.action)
                    return current;
                throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'MODERATION_REPORT_RESOLVED', 'This moderation report has already been resolved');
            }
            await this.applyAction(manager, current, body.action, suspensionEndsAt);
            current.status = body.action === 'dismiss' ? 'dismissed' : 'actioned';
            current.action = body.action;
            current.reviewedByAdminId = adminId;
            current.resolutionNotes = String(body.notes || '').trim() || null;
            current.suspensionEndsAt = suspensionEndsAt;
            current.resolvedAt = new Date();
            current.activeKey = null;
            await manager.save(current);
            await manager.getRepository(moderation_audit_entity_1.ModerationAudit).save(manager.getRepository(moderation_audit_entity_1.ModerationAudit).create({
                reportId: current.id,
                actorUserId: adminId,
                event: 'resolved',
                notes: current.resolutionNotes,
                metadata: {
                    action: body.action,
                    suspensionEndsAt: suspensionEndsAt?.toISOString() || null,
                },
            }));
            return current;
        });
        await this.notifyResolution(report);
        return {
            message: 'Moderation report updated successfully',
            report: this.formatReport(report),
        };
    }
    async listReelReports(status = 'pending', page = 1, limit = 20) {
        const canonicalStatus = status === 'reviewed' || status === 'actioned' ? 'actioned' : status;
        const result = await this.listReports({
            status: canonicalStatus,
            targetType: 'reel',
            page,
            limit,
        });
        return {
            ...result,
            data: result.data.map((report) => ({
                ...report,
                canonicalReportId: report.reportId,
                id: report.legacySourceId || report.id,
                reportId: report.legacySourceId || report.reportId,
            })),
        };
    }
    async resolveReelReport(reportId, adminId, status, resolutionNote) {
        const action = status === 'dismissed'
            ? 'dismiss'
            : status === 'actioned'
                ? 'hide'
                : 'warn';
        const migrated = await this.reportRepo.findOne({
            where: {
                legacySourceType: 'reel_report',
                legacySourceId: reportId,
            },
        });
        return this.resolveReport(migrated?.id || reportId, adminId, {
            action,
            notes: resolutionNote,
        });
    }
    async createReport(reporterUserId, body, target) {
        if (target.targetOwnerUserId === reporterUserId) {
            throw new common_1.BadRequestException('You cannot report your own content');
        }
        const activeKey = `${reporterUserId}:${target.targetType}:${target.targetId}`;
        try {
            const report = await this.reportRepo.manager.transaction(async (manager) => {
                const created = await manager.getRepository(moderation_report_entity_1.ModerationReport).save(manager.getRepository(moderation_report_entity_1.ModerationReport).create({
                    ...target,
                    reporterUserId,
                    reason: String(body.reason || '').trim(),
                    details: String(body.details || '').trim() || null,
                    targetSnapshot: target.snapshot || {},
                    activeKey,
                    status: 'pending',
                }));
                await manager.getRepository(moderation_audit_entity_1.ModerationAudit).save(manager.getRepository(moderation_audit_entity_1.ModerationAudit).create({
                    reportId: created.id,
                    actorUserId: reporterUserId,
                    event: 'reported',
                    notes: null,
                    metadata: { reason: created.reason },
                }));
                return created;
            });
            return {
                reportId: String(report.id),
                status: report.status,
                reported: true,
            };
        }
        catch (error) {
            if (error?.code === 'ER_DUP_ENTRY') {
                throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'MODERATION_REPORT_DUPLICATE', 'This content has already been reported');
            }
            throw error;
        }
    }
    async applyAction(manager, report, action, suspensionEndsAt) {
        if (action === 'dismiss' || action === 'warn')
            return;
        if (action === 'hide' || action === 'remove') {
            const status = action === 'hide' ? 'hidden' : 'removed';
            const id = Number(report.targetId);
            if (!Number.isInteger(id) || id <= 0) {
                throw new common_1.BadRequestException('Moderation target is invalid');
            }
            if (report.targetType === 'post') {
                await manager.update(community_post_entity_1.CommunityPost, id, { moderationStatus: status });
                return;
            }
            if (report.targetType === 'post_comment') {
                await manager.update(post_comment_entity_1.PostComment, id, { moderationStatus: status });
                return;
            }
            if (report.targetType === 'reel') {
                await manager.update(reel_entity_1.Reel, id, { moderationStatus: status });
                return;
            }
            if (report.targetType === 'reel_comment') {
                await manager.update(reel_comment_entity_1.ReelComment, id, { moderationStatus: status });
                return;
            }
            if (report.targetType === 'chat_message') {
                await manager.update(chat_message_entity_1.ChatMessage, id, { moderationStatus: status });
                return;
            }
            if (report.targetType === 'job') {
                await manager.update(job_entity_1.Job, id, {
                    moderationStatus: status,
                    ...(action === 'remove'
                        ? { status: 'closed', isActive: false }
                        : {}),
                });
                return;
            }
            await this.suspendTarget(manager, report, null);
            return;
        }
        if (action === 'suspend') {
            await this.suspendTarget(manager, report, suspensionEndsAt);
            return;
        }
        if (action === 'ban') {
            if (report.targetType === 'company' && report.targetCompanyId) {
                await manager.update(company_page_entity_1.CompanyPage, report.targetCompanyId, {
                    verificationStatus: 'suspended',
                    verificationReason: 'Suspended by moderation',
                });
                return;
            }
            if (!report.targetOwnerUserId) {
                throw new common_1.BadRequestException('This target cannot be banned');
            }
            await manager
                .createQueryBuilder()
                .update(user_entity_1.User)
                .set({
                isBanned: true,
                tokenVersion: () => 'tokenVersion + 1',
            })
                .where('id = :id', { id: report.targetOwnerUserId })
                .execute();
        }
    }
    async suspendTarget(manager, report, suspensionEndsAt) {
        if (report.targetCompanyId) {
            await manager.update(company_page_entity_1.CompanyPage, report.targetCompanyId, {
                verificationStatus: 'suspended',
                verificationReason: 'Suspended by moderation',
            });
            return;
        }
        if (!report.targetOwnerUserId) {
            throw new common_1.BadRequestException('This target cannot be suspended');
        }
        await manager
            .createQueryBuilder()
            .update(user_entity_1.User)
            .set({
            suspendedAt: new Date(),
            suspendedUntil: suspensionEndsAt,
            suspensionReason: 'Suspended by moderation',
            tokenVersion: () => 'tokenVersion + 1',
        })
            .where('id = :id', { id: report.targetOwnerUserId })
            .execute();
    }
    async notifyResolution(report) {
        const recipients = new Map();
        recipients.set(report.reporterUserId, 'reporter');
        if (report.targetOwnerUserId) {
            recipients.set(report.targetOwnerUserId, 'target');
        }
        await Promise.all([...recipients].map(([userId, role]) => this.notificationsService.create({
            userId,
            type: role === 'target'
                ? 'reported_content_action'
                : 'moderation_outcome',
            title: role === 'target'
                ? 'Content moderation update'
                : 'Report reviewed',
            message: role === 'target'
                ? `A moderation action (${report.action}) was applied.`
                : `Your report was ${report.status}.`,
            data: {
                reportId: String(report.id),
                targetType: report.targetType,
                targetId: report.targetId,
                action: report.action,
            },
            dedupeKey: `moderation:${report.id}:${report.action}:${userId}:${role}`,
        })));
    }
    async assertPublisherReportable(reporterUserId, publisherType, creatorId, companyId) {
        if (creatorId === reporterUserId) {
            throw new common_1.BadRequestException('You cannot report your own content');
        }
        if (publisherType === 'company' && companyId) {
            const company = await this.companyRepo.findOne({ where: { id: companyId } });
            if (company && (await this.userHasCompanyAccess(reporterUserId, company))) {
                throw new common_1.BadRequestException('You cannot report your own content');
            }
            await this.assertInteractionAllowed(reporterUserId, 'company', companyId);
            return;
        }
        await this.assertInteractionAllowed(reporterUserId, 'user', creatorId);
    }
    postVisible(post) {
        return Boolean(post &&
            !post.deletedAt &&
            post.mediaStatus === 'published' &&
            (!post.moderationStatus || post.moderationStatus === 'visible') &&
            !post.creator?.isBanned &&
            !post.creator?.deletedAt &&
            (post.publisherType !== 'company' ||
                post.publisherCompany?.verificationStatus === 'approved'));
    }
    reelVisible(reel) {
        return Boolean(reel &&
            !reel.deletedAt &&
            reel.status === 'published' &&
            reel.visibility !== 'draft' &&
            (!reel.moderationStatus || reel.moderationStatus === 'visible') &&
            !reel.creator?.isBanned &&
            !reel.creator?.deletedAt &&
            (reel.publisherType !== 'company' ||
                reel.publisherCompany?.verificationStatus === 'approved'));
    }
    async userHasCompanyAccess(userId, company) {
        if (company.ownerId === userId)
            return true;
        return Boolean(await this.pageMemberRepo.findOne({
            where: { pageId: company.id, userId, hasAccess: true },
        }));
    }
    formatReport(report) {
        return {
            id: String(report.id),
            reportId: String(report.id),
            targetType: report.targetType,
            targetId: report.targetId,
            reporterUserId: String(report.reporterUserId),
            targetOwnerUserId: report.targetOwnerUserId
                ? String(report.targetOwnerUserId)
                : null,
            targetCompanyId: report.targetCompanyId
                ? String(report.targetCompanyId)
                : null,
            reason: report.reason,
            details: report.details,
            targetSnapshot: report.targetSnapshot || {},
            legacySourceType: report.legacySourceType,
            legacySourceId: report.legacySourceId
                ? String(report.legacySourceId)
                : null,
            status: report.status,
            action: report.action,
            reviewedByAdminId: report.reviewedByAdminId
                ? String(report.reviewedByAdminId)
                : null,
            resolutionNotes: report.resolutionNotes,
            suspensionEndsAt: report.suspensionEndsAt,
            resolvedAt: report.resolvedAt,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
        };
    }
    async assertTargetExists(type, id) {
        const target = type === 'user'
            ? await this.userRepo.findOne({ where: { id } })
            : await this.companyRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('Profile not found');
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(profile_block_entity_1.ProfileBlock)),
    __param(1, (0, typeorm_1.InjectRepository)(profile_follow_entity_1.ProfileFollow)),
    __param(2, (0, typeorm_1.InjectRepository)(reel_creator_follow_entity_1.ReelCreatorFollow)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(5, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(6, (0, typeorm_1.InjectRepository)(reel_entity_1.Reel)),
    __param(7, (0, typeorm_1.InjectRepository)(reel_comment_entity_1.ReelComment)),
    __param(8, (0, typeorm_1.InjectRepository)(reel_report_entity_1.ReelReport)),
    __param(9, (0, typeorm_1.InjectRepository)(community_post_entity_1.CommunityPost)),
    __param(10, (0, typeorm_1.InjectRepository)(post_comment_entity_1.PostComment)),
    __param(11, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(12, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(13, (0, typeorm_1.InjectRepository)(moderation_report_entity_1.ModerationReport)),
    __param(14, (0, typeorm_1.InjectRepository)(moderation_audit_entity_1.ModerationAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map