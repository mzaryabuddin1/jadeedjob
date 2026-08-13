import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { CommunityPost } from 'src/posts/entities/community-post.entity';
import { PostComment } from 'src/posts/entities/post-comment.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import {
  ProfileFollow,
  ProfileType,
} from 'src/profiles/entities/profile-follow.entity';
import {
  formatCompanyPublisher,
  formatUserPublisher,
} from 'src/profiles/profile-format.util';
import { ReelComment } from 'src/reels/entities/reel-comment.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ReelReport } from 'src/reels/entities/reel-report.entity';
import { Reel } from 'src/reels/entities/reel.entity';
import { User } from 'src/users/entities/user.entity';
import { ModerationAudit } from './entities/moderation-audit.entity';
import {
  ModerationAction,
  ModerationReport,
  ModerationTargetType,
} from './entities/moderation-report.entity';

type ReportBody = { reason: string; details?: string };

type ResolvedTarget = {
  targetType: ModerationTargetType;
  targetId: string;
  targetOwnerUserId?: number | null;
  targetCompanyId?: number | null;
  snapshot?: Record<string, unknown>;
};

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ProfileBlock)
    private readonly blockRepo: Repository<ProfileBlock>,
    @InjectRepository(ProfileFollow)
    private readonly followRepo: Repository<ProfileFollow>,
    @InjectRepository(ReelCreatorFollow)
    private readonly legacyFollowRepo: Repository<ReelCreatorFollow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyPage)
    private readonly companyRepo: Repository<CompanyPage>,
    @InjectRepository(PageMember)
    private readonly pageMemberRepo: Repository<PageMember>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
    @InjectRepository(ReelComment)
    private readonly reelCommentRepo: Repository<ReelComment>,
    @InjectRepository(ReelReport)
    private readonly legacyReelReportRepo: Repository<ReelReport>,
    @InjectRepository(CommunityPost)
    private readonly postRepo: Repository<CommunityPost>,
    @InjectRepository(PostComment)
    private readonly postCommentRepo: Repository<PostComment>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(ModerationReport)
    private readonly reportRepo: Repository<ModerationReport>,
    @InjectRepository(ModerationAudit)
    private readonly auditRepo: Repository<ModerationAudit>,
    private readonly notificationsService: NotificationsService,
  ) {}

  parseProfileType(value: string): ProfileType {
    if (value !== 'user' && value !== 'company') {
      throw new BadRequestException('Invalid profile type');
    }
    return value;
  }

  async block(
    blockerUserId: number,
    profileTypeValue: string,
    profileId: number,
  ) {
    const profileType = this.parseProfileType(profileTypeValue);
    await this.assertTargetExists(profileType, profileId);
    if (profileType === 'user' && blockerUserId === profileId) {
      throw new BadRequestException('You cannot block yourself');
    }

    await this.blockRepo.manager.transaction(async (manager) => {
      await manager
        .getRepository(ProfileBlock)
        .createQueryBuilder()
        .insert()
        .values({ blockerUserId, profileType, profileId })
        .orIgnore()
        .execute();

      const follows = manager.getRepository(ProfileFollow);
      await follows.delete({ followerUserId: blockerUserId, profileType, profileId });
      if (profileType === 'user') {
        await follows.delete({
          followerUserId: profileId,
          profileType: 'user',
          profileId: blockerUserId,
        });
        const legacy = manager.getRepository(ReelCreatorFollow);
        await legacy.delete([
          { followerId: blockerUserId, creatorId: profileId },
          { followerId: profileId, creatorId: blockerUserId },
        ]);
      }
    });

    return { profileType, profileId: String(profileId), blocked: true };
  }

  async unblock(
    blockerUserId: number,
    profileTypeValue: string,
    profileId: number,
  ) {
    const profileType = this.parseProfileType(profileTypeValue);
    await this.blockRepo.delete({ blockerUserId, profileType, profileId });
    return { profileType, profileId: String(profileId), blocked: false };
  }

  async listBlocked(userId: number, page = 1, limit = 20) {
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
      userIds.length ? this.userRepo.findBy({ id: In(userIds) }) : [],
      companyIds.length ? this.companyRepo.findBy({ id: In(companyIds) }) : [],
    ]);
    const userMap = new Map<number, User>(
      users.map((item): [number, User] => [item.id, item]),
    );
    const companyMap = new Map<number, CompanyPage>(
      companies.map((item): [number, CompanyPage] => [item.id, item]),
    );

    return {
      data: blocks
        .map((item) => {
          const target =
            item.profileType === 'user'
              ? userMap.get(item.profileId)
              : companyMap.get(item.profileId);
          if (!target) return null;
          return {
            ...(item.profileType === 'user'
              ? formatUserPublisher(target as User)
              : formatCompanyPublisher(target as CompanyPage)),
            blockedAt: item.createdAt,
          };
        })
        .filter(Boolean),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async isInteractionBlocked(
    viewerId: number,
    targetType: ProfileType,
    targetId: number,
  ) {
    const direct = await this.blockRepo.findOne({
      where: { blockerUserId: viewerId, profileType: targetType, profileId: targetId },
    });
    if (direct) return true;
    if (targetType !== 'user') return false;
    return Boolean(
      await this.blockRepo.findOne({
        where: {
          blockerUserId: targetId,
          profileType: 'user',
          profileId: viewerId,
        },
      }),
    );
  }

  async assertInteractionAllowed(
    viewerId: number,
    targetType: ProfileType,
    targetId: number,
  ) {
    if (await this.isInteractionBlocked(viewerId, targetType, targetId)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'PROFILE_BLOCKED',
        'This action is unavailable because of a blocked relationship',
      );
    }
  }

  async blockedTargets(userId: number) {
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
        ...new Set(
          own
            .filter((item) => item.profileType === 'company')
            .map((item) => item.profileId),
        ),
      ],
    };
  }

  async reportPost(postId: number, reporterUserId: number, body: ReportBody) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['creator', 'publisherCompany'],
    });
    if (!this.postVisible(post)) throw new NotFoundException('Post not found');
    await this.assertPublisherReportable(
      reporterUserId,
      post.publisherType,
      post.creatorId,
      post.publisherCompanyId,
    );
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
    } catch (error) {
      const response =
        error instanceof ApiException ? (error.getResponse() as any) : null;
      if (response?.code === 'MODERATION_REPORT_DUPLICATE') {
        throw new BadRequestException('Post already reported');
      }
      throw error;
    }
  }

  async reportPostComment(
    postId: number,
    commentId: number,
    reporterUserId: number,
    body: ReportBody,
  ) {
    const comment = await this.postCommentRepo.findOne({
      where: { id: commentId, postId },
      relations: ['post', 'post.creator', 'post.publisherCompany', 'user'],
    });
    if (
      !comment ||
      comment.deletedAt ||
      (comment.moderationStatus && comment.moderationStatus !== 'visible')
    ) {
      throw new NotFoundException('Comment not found');
    }
    if (!this.postVisible(comment.post)) throw new NotFoundException('Post not found');
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

  async reportReel(
    reelId: number,
    reporterUserId: number,
    body: ReportBody,
  ) {
    const reel = await this.reelRepo.findOne({
      where: { id: reelId },
      relations: ['creator', 'publisherCompany'],
    });
    if (!this.reelVisible(reel)) throw new NotFoundException('Reel not found');
    await this.assertPublisherReportable(
      reporterUserId,
      reel.publisherType,
      reel.creatorId,
      reel.publisherCompanyId,
    );
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

  async reportReelComment(
    reelId: number,
    commentId: number,
    reporterUserId: number,
    body: ReportBody,
  ) {
    const comment = await this.reelCommentRepo.findOne({
      where: { id: commentId, reelId },
      relations: ['reel', 'reel.creator', 'reel.publisherCompany', 'user'],
    });
    if (
      !comment ||
      comment.deletedAt ||
      (comment.moderationStatus && comment.moderationStatus !== 'visible')
    ) {
      throw new NotFoundException('Comment not found');
    }
    if (!this.reelVisible(comment.reel)) throw new NotFoundException('Reel not found');
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

  async reportProfile(
    profileTypeValue: string,
    profileId: number,
    reporterUserId: number,
    body: ReportBody,
  ) {
    const profileType = this.parseProfileType(profileTypeValue);
    await this.assertInteractionAllowed(reporterUserId, profileType, profileId);
    if (profileType === 'user') {
      const user = await this.userRepo.findOne({ where: { id: profileId } });
      if (!user || user.isBanned || user.deletedAt) {
        throw new NotFoundException('Profile not found');
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
      throw new NotFoundException('Profile not found');
    }
    if (await this.userHasCompanyAccess(reporterUserId, company)) {
      throw new BadRequestException('You cannot report your own profile');
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

  async reportJob(jobId: number, reporterUserId: number, body: ReportBody) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['creator', 'page'],
    });
    if (
      !job ||
      !job.isActive ||
      job.status !== 'active' ||
      (job.moderationStatus && job.moderationStatus !== 'visible') ||
      job.creator?.isBanned ||
      job.creator?.deletedAt ||
      (job.pageId && job.page?.verificationStatus !== 'approved')
    ) {
      throw new NotFoundException('Job not found');
    }
    await this.assertPublisherReportable(
      reporterUserId,
      job.pageId ? 'company' : 'user',
      job.createdBy,
      job.pageId,
    );
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

  async reportResolvedTarget(
    reporterUserId: number,
    body: ReportBody,
    target: ResolvedTarget,
  ) {
    if (target.targetOwnerUserId === reporterUserId) {
      throw new BadRequestException('You cannot report your own content');
    }
    return this.createReport(reporterUserId, body, target);
  }

  async listReports(query: {
    status?: string;
    targetType?: ModerationTargetType;
    page?: number;
    limit?: number;
  }) {
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

  async getReport(reportId: number) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Moderation report not found');
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

  async resolveReport(
    reportId: number,
    adminId: number,
    body: {
      action: ModerationAction;
      notes?: string;
      suspensionEndsAt?: string | null;
    },
  ) {
    const suspensionEndsAt = body.suspensionEndsAt
      ? new Date(body.suspensionEndsAt)
      : null;
    const report = await this.reportRepo.manager.transaction(async (manager) => {
      const current = await manager.getRepository(ModerationReport).findOne({
        where: { id: reportId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Moderation report not found');
      if (current.status !== 'pending') {
        if (current.action === body.action) return current;
        throw new ApiException(
          HttpStatus.CONFLICT,
          'MODERATION_REPORT_RESOLVED',
          'This moderation report has already been resolved',
        );
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
      await manager.getRepository(ModerationAudit).save(
        manager.getRepository(ModerationAudit).create({
          reportId: current.id,
          actorUserId: adminId,
          event: 'resolved',
          notes: current.resolutionNotes,
          metadata: {
            action: body.action,
            suspensionEndsAt: suspensionEndsAt?.toISOString() || null,
          },
        }),
      );
      return current;
    });

    await this.notifyResolution(report);
    return {
      message: 'Moderation report updated successfully',
      report: this.formatReport(report),
    };
  }

  async listReelReports(status = 'pending', page = 1, limit = 20) {
    const canonicalStatus =
      status === 'reviewed' || status === 'actioned' ? 'actioned' : status;
    const result = await this.listReports({
      status: canonicalStatus,
      targetType: 'reel',
      page,
      limit,
    });
    return {
      ...result,
      data: result.data.map((report: any) => ({
        ...report,
        canonicalReportId: report.reportId,
        id: report.legacySourceId || report.id,
        reportId: report.legacySourceId || report.reportId,
      })),
    };
  }

  async resolveReelReport(
    reportId: number,
    adminId: number,
    status: ReelReport['status'],
    resolutionNote?: string,
  ) {
    const action: ModerationAction =
      status === 'dismissed'
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

  private async createReport(
    reporterUserId: number,
    body: ReportBody,
    target: ResolvedTarget,
  ) {
    if (target.targetOwnerUserId === reporterUserId) {
      throw new BadRequestException('You cannot report your own content');
    }
    const activeKey = `${reporterUserId}:${target.targetType}:${target.targetId}`;
    try {
      const report = await this.reportRepo.manager.transaction(async (manager) => {
        const created = await manager.getRepository(ModerationReport).save(
          manager.getRepository(ModerationReport).create({
            ...target,
            reporterUserId,
            reason: String(body.reason || '').trim(),
            details: String(body.details || '').trim() || null,
            targetSnapshot: target.snapshot || {},
            activeKey,
            status: 'pending',
          }),
        );
        await manager.getRepository(ModerationAudit).save(
          manager.getRepository(ModerationAudit).create({
            reportId: created.id,
            actorUserId: reporterUserId,
            event: 'reported',
            notes: null,
            metadata: { reason: created.reason },
          }),
        );
        return created;
      });
      return {
        reportId: String(report.id),
        status: report.status,
        reported: true,
      };
    } catch (error) {
      if ((error as any)?.code === 'ER_DUP_ENTRY') {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'MODERATION_REPORT_DUPLICATE',
          'This content has already been reported',
        );
      }
      throw error;
    }
  }

  private async applyAction(
    manager: EntityManager,
    report: ModerationReport,
    action: ModerationAction,
    suspensionEndsAt: Date | null,
  ) {
    if (action === 'dismiss' || action === 'warn') return;
    if (action === 'hide' || action === 'remove') {
      const status = action === 'hide' ? 'hidden' : 'removed';
      const id = Number(report.targetId);
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException('Moderation target is invalid');
      }
      if (report.targetType === 'post') {
        await manager.update(CommunityPost, id, { moderationStatus: status });
        return;
      }
      if (report.targetType === 'post_comment') {
        await manager.update(PostComment, id, { moderationStatus: status });
        return;
      }
      if (report.targetType === 'reel') {
        await manager.update(Reel, id, { moderationStatus: status });
        return;
      }
      if (report.targetType === 'reel_comment') {
        await manager.update(ReelComment, id, { moderationStatus: status });
        return;
      }
      if (report.targetType === 'chat_message') {
        await manager.update(ChatMessage, id, { moderationStatus: status });
        return;
      }
      if (report.targetType === 'job') {
        await manager.update(Job, id, {
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
        await manager.update(CompanyPage, report.targetCompanyId, {
          verificationStatus: 'suspended',
          verificationReason: 'Suspended by moderation',
        });
        return;
      }
      if (!report.targetOwnerUserId) {
        throw new BadRequestException('This target cannot be banned');
      }
      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          isBanned: true,
          tokenVersion: () => 'tokenVersion + 1',
        })
        .where('id = :id', { id: report.targetOwnerUserId })
        .execute();
    }
  }

  private async suspendTarget(
    manager: EntityManager,
    report: ModerationReport,
    suspensionEndsAt: Date | null,
  ) {
    if (report.targetCompanyId) {
      await manager.update(CompanyPage, report.targetCompanyId, {
        verificationStatus: 'suspended',
        verificationReason: 'Suspended by moderation',
      });
      return;
    }
    if (!report.targetOwnerUserId) {
      throw new BadRequestException('This target cannot be suspended');
    }
    await manager
      .createQueryBuilder()
      .update(User)
      .set({
        suspendedAt: new Date(),
        suspendedUntil: suspensionEndsAt,
        suspensionReason: 'Suspended by moderation',
        tokenVersion: () => 'tokenVersion + 1',
      })
      .where('id = :id', { id: report.targetOwnerUserId })
      .execute();
  }

  private async notifyResolution(report: ModerationReport) {
    const recipients = new Map<number, 'reporter' | 'target'>();
    recipients.set(report.reporterUserId, 'reporter');
    if (report.targetOwnerUserId) {
      recipients.set(report.targetOwnerUserId, 'target');
    }
    await Promise.all(
      [...recipients].map(([userId, role]) =>
        this.notificationsService.create({
          userId,
          type:
            role === 'target'
              ? 'reported_content_action'
              : 'moderation_outcome',
          title:
            role === 'target'
              ? 'Content moderation update'
              : 'Report reviewed',
          message:
            role === 'target'
              ? `A moderation action (${report.action}) was applied.`
              : `Your report was ${report.status}.`,
          data: {
            reportId: String(report.id),
            targetType: report.targetType,
            targetId: report.targetId,
            action: report.action,
          },
          dedupeKey: `moderation:${report.id}:${report.action}:${userId}:${role}`,
        }),
      ),
    );
  }

  private async assertPublisherReportable(
    reporterUserId: number,
    publisherType: string,
    creatorId: number,
    companyId?: number | null,
  ) {
    if (creatorId === reporterUserId) {
      throw new BadRequestException('You cannot report your own content');
    }
    if (publisherType === 'company' && companyId) {
      const company = await this.companyRepo.findOne({ where: { id: companyId } });
      if (company && (await this.userHasCompanyAccess(reporterUserId, company))) {
        throw new BadRequestException('You cannot report your own content');
      }
      await this.assertInteractionAllowed(reporterUserId, 'company', companyId);
      return;
    }
    await this.assertInteractionAllowed(reporterUserId, 'user', creatorId);
  }

  private postVisible(post?: CommunityPost | null) {
    return Boolean(
      post &&
        !post.deletedAt &&
        post.mediaStatus === 'published' &&
        (!post.moderationStatus || post.moderationStatus === 'visible') &&
        !post.creator?.isBanned &&
        !post.creator?.deletedAt &&
        (post.publisherType !== 'company' ||
          post.publisherCompany?.verificationStatus === 'approved'),
    );
  }

  private reelVisible(reel?: Reel | null) {
    return Boolean(
      reel &&
        !reel.deletedAt &&
        reel.status === 'published' &&
        reel.visibility !== 'draft' &&
        (!reel.moderationStatus || reel.moderationStatus === 'visible') &&
        !reel.creator?.isBanned &&
        !reel.creator?.deletedAt &&
        (reel.publisherType !== 'company' ||
          reel.publisherCompany?.verificationStatus === 'approved'),
    );
  }

  private async userHasCompanyAccess(userId: number, company: CompanyPage) {
    if (company.ownerId === userId) return true;
    return Boolean(
      await this.pageMemberRepo.findOne({
        where: { pageId: company.id, userId, hasAccess: true },
      }),
    );
  }

  private formatReport(report: ModerationReport) {
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

  private async assertTargetExists(type: ProfileType, id: number) {
    const target =
      type === 'user'
        ? await this.userRepo.findOne({ where: { id } })
        : await this.companyRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Profile not found');
  }
}
