import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { UserBlock } from './entities/user-block.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { Page } from 'src/pages/entities/page.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { ChatEvents } from './chat-events.service';
import { JOB_TEAM_ROLES, isJobTeam, jobTeamIds } from './job-team.util';

export type OpenDto =
  | { type: 'direct'; userId: number }
  | { type: 'job'; jobId: number; userId?: number };

const FAR_FUTURE = new Date('2100-01-01T00:00:00Z');
const DM_DAILY_LIMIT = Math.max(1, Number(process.env.CHAT_DM_DAILY_LIMIT) || 30);

export const personView = (u: User | undefined | null) =>
  u
    ? {
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        username: u.username,
        profile_photo: u.profile_photo,
      }
    : null;

/**
 * Which conversations a person can see, evaluated against the CURRENT page
 * team (so removing someone from a page takes the page's job chats away from
 * them immediately). `c` = conversations, `j` = jobs (left joined).
 */
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

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    private readonly events: ChatEvents,
  ) {}

  // ────────────────────────────────────────────────
  // OPEN (get or create)
  // ────────────────────────────────────────────────

  /** Idempotent: the same chat always comes back as the same conversation */
  async open(userId: number, dto: OpenDto) {
    const conv = await this.getOrCreate(userId, dto);
    return this.view(conv, userId);
  }

  /**
   * direct: `d:{lowId}:{highId}`. job: `j:{jobId}:{applicantId}` - one chat per
   * person per job. The employer side never "owns" a chat: any current member
   * of the job's team can open the same conversation (see `hasAccess`).
   */
  async getOrCreate(
    userId: number,
    dto: OpenDto,
    opts: { allowInactive?: boolean } = {},
  ): Promise<Conversation> {
    if (dto.type === 'direct') return this.getOrCreateDirect(userId, dto.userId);
    return this.getOrCreateJobChat(userId, dto.jobId, dto.userId, opts);
  }

  private async getOrCreateDirect(userId: number, otherId: number) {
    const target = await this.userRepo.findOne({
      where: { id: otherId },
      select: ['id', 'isBanned'],
    });
    if (!target || target.isBanned) throw new NotFoundException('User not found');
    if (target.id === userId) throw new BadRequestException('You cannot message yourself');
    await this.assertNotBlocked(userId, target.id);

    const key = `d:${Math.min(userId, target.id)}:${Math.max(userId, target.id)}`;
    const existing = await this.convRepo.findOne({ where: { key } });
    if (existing) return existing;

    await this.assertDmQuota(userId);
    const conv = await this.insertConversation({ type: 'direct', key, createdBy: userId });
    await this.addMembers(conv.id, [userId, target.id]);
    return conv;
  }

  private async getOrCreateJobChat(
    userId: number,
    jobId: number,
    withUserId: number | undefined,
    opts: { allowInactive?: boolean },
  ) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'createdBy', 'pageId', 'isActive'],
    });
    if (!job) throw new NotFoundException('Job not found');

    const team = await isJobTeam(this.pageRepo, job, userId);
    let applicantId: number;

    if (team) {
      // the employer side starts a chat with someone who applied to this job
      if (!withUserId) {
        throw new BadRequestException(
          'Send userId: the applicant you want to contact about this job',
        );
      }
      const person = await this.userRepo.findOne({
        where: { id: withUserId },
        select: ['id', 'isBanned'],
      });
      if (!person || person.isBanned) throw new NotFoundException('User not found');
      if (await isJobTeam(this.pageRepo, job, person.id)) {
        throw new BadRequestException('That person is on the employer side of this job');
      }
      applicantId = person.id;
    } else {
      if (withUserId && withUserId !== userId) {
        throw new BadRequestException('userId is only for the employer side of the job');
      }
      applicantId = userId;
    }

    const key = `j:${job.id}:${applicantId}`;
    const existing = await this.convRepo.findOne({ where: { key } });
    if (existing) return existing;

    // a NEW chat started by the employer side: only with someone who applied
    if (team) {
      const applied = await this.appRepo.exist({ where: { jobId: job.id, applicantId } });
      if (!applied) {
        throw new ForbiddenException('You can only contact people who applied to this job');
      }
    }

    if (!team && !job.isActive && !opts.allowInactive) {
      throw new NotFoundException('Job not found or not active');
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

  private async insertConversation(data: Partial<Conversation> & { key: string }) {
    try {
      return await this.convRepo.save(this.convRepo.create({ jobId: null, ...data }));
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        return this.convRepo.findOneOrFail({ where: { key: data.key } });
      }
      throw err;
    }
  }

  private async addMembers(conversationId: number, userIds: number[]) {
    await this.memberRepo
      .createQueryBuilder()
      .insert()
      .into(ConversationMember)
      .values([...new Set(userIds)].map((userId) => ({ conversationId, userId })))
      .orIgnore()
      .execute();
  }

  private async assertDmQuota(userId: number) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const n = await this.convRepo
      .createQueryBuilder('c')
      .where("c.type = 'direct' AND c.createdBy = :userId AND c.createdAt > :since", {
        userId,
        since,
      })
      .getCount();
    if (n >= DM_DAILY_LIMIT) {
      throw new ForbiddenException(
        `You can start at most ${DM_DAILY_LIMIT} new conversations a day`,
      );
    }
  }

  // ────────────────────────────────────────────────
  // ACCESS + AUDIENCE
  // ────────────────────────────────────────────────

  /**
   * - direct: the two people.
   * - job: the applicant, and everybody on the job's team AT THIS MOMENT
   *   (personal job: the poster; page job: page owner + admins/editors).
   */
  async hasAccess(conv: Conversation, userId: number): Promise<boolean> {
    if (conv.type === 'direct') {
      return this.memberRepo.exist({ where: { conversationId: conv.id, userId } });
    }
    if (conv.createdBy === userId) return true;
    const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
    return !!job && (await isJobTeam(this.pageRepo, job, userId));
  }

  async requireAccess(conversationId: number, userId: number) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (!(await this.hasAccess(conv, userId))) {
      throw new ForbiddenException('You are not part of this chat');
    }
    // each person keeps their own read position / mute (created on first use)
    let member = await this.memberRepo.findOne({ where: { conversationId, userId } });
    if (!member) {
      await this.addMembers(conversationId, [userId]);
      member = await this.memberRepo.findOneOrFail({ where: { conversationId, userId } });
    }
    return { conv, member };
  }

  /** everybody who should see live events of this conversation */
  async audience(conv: Conversation): Promise<number[]> {
    if (conv.type === 'direct') {
      const rows = await this.memberRepo.find({
        where: { conversationId: conv.id },
        select: ['userId'],
      });
      return rows.map((r) => r.userId);
    }
    return [conv.createdBy, ...(await this.team(conv))];
  }

  /** who gets notified about a message from `senderId` */
  async recipientsFor(conv: Conversation, senderId: number): Promise<number[]> {
    if (conv.type === 'direct') {
      return (await this.audience(conv)).filter((id) => id !== senderId);
    }
    // applicant writes -> the whole team; a team member writes -> the applicant
    return senderId === conv.createdBy ? await this.team(conv) : [conv.createdBy];
  }

  private async team(conv: Conversation): Promise<number[]> {
    const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
    return job ? jobTeamIds(this.pageRepo, job) : [];
  }

  // ────────────────────────────────────────────────
  // BLOCKS
  // ────────────────────────────────────────────────

  async blockedBetween(a: number, b: number) {
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

  async assertNotBlocked(a: number, b: number) {
    const s = await this.blockedBetween(a, b);
    if (s.byMe || s.byThem) {
      throw new ForbiddenException('You cannot message this person');
    }
  }

  /**
   * Blocks are personal: they stop a DM, a job chat on a PERSONAL job (poster
   * <-> applicant), and a team member from messaging an applicant who blocked
   * them. A page job's chat is not stopped by one person's block - the rest of
   * the team can still answer.
   */
  private async assertCanContact(job: Job, senderId: number, applicantId: number, senderIsTeam: boolean) {
    if (senderIsTeam) return this.assertNotBlocked(senderId, applicantId);
    if (!job.pageId) return this.assertNotBlocked(senderId, job.createdBy);
  }

  /** called before every message */
  async assertCanSend(conv: Conversation, senderId: number) {
    if (conv.type === 'direct') {
      for (const other of (await this.audience(conv)).filter((id) => id !== senderId)) {
        await this.assertNotBlocked(senderId, other);
      }
      return;
    }
    const job = conv.jobId ? await this.jobRepo.findOne({ where: { id: conv.jobId } }) : null;
    if (!job) return;
    const senderIsTeam = senderId !== conv.createdBy;
    await this.assertCanContact(job, senderId, conv.createdBy, senderIsTeam);
  }

  async block(userId: number, targetId: number) {
    if (userId === targetId) throw new BadRequestException('You cannot block yourself');
    if (!(await this.userRepo.exist({ where: { id: targetId } }))) {
      throw new NotFoundException('User not found');
    }
    await this.blockRepo
      .createQueryBuilder()
      .insert()
      .into(UserBlock)
      .values({ blockerId: userId, blockedId: targetId })
      .orIgnore()
      .execute();
    return { blocked: true };
  }

  async unblock(userId: number, targetId: number) {
    await this.blockRepo.delete({ blockerId: userId, blockedId: targetId });
    return { blocked: false };
  }

  async listBlocks(userId: number) {
    const rows = await this.blockRepo.find({
      where: { blockerId: userId },
      order: { id: 'DESC' },
    });
    const users = await this.usersById(rows.map((r) => r.blockedId));
    return rows.map((r) => ({
      ...personView(users.get(r.blockedId)),
      id: r.blockedId,
      blockedAt: r.createdAt,
    }));
  }

  // ────────────────────────────────────────────────
  // INBOX
  // ────────────────────────────────────────────────

  async list(userId: number, opts: { page?: number; limit?: number }) {
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
    const page = Math.max(1, Number(opts.page) || 1);

    const [rows, total] = await this.convRepo
      .createQueryBuilder('c')
      .leftJoin(Job, 'j', 'j.id = c.jobId')
      .where('c.lastMessageId IS NOT NULL')
      .andWhere(VISIBLE, { me: userId, roles: JOB_TEAM_ROLES })
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

  async view(conv: Conversation, userId: number) {
    return (await this.views([conv], userId))[0];
  }

  async get(userId: number, conversationId: number) {
    const { conv } = await this.requireAccess(conversationId, userId);
    return this.view(conv, userId);
  }

  private async views(convs: Conversation[], userId: number) {
    if (!convs.length) return [];
    const ids = convs.map((c) => c.id);

    const [members, lastMessages, unread, jobs] = await Promise.all([
      this.memberRepo.find({ where: { conversationId: In(ids) } }),
      this.msgRepo.find({
        where: { id: In(convs.map((c) => c.lastMessageId).filter(Boolean) as number[]) },
      }),
      this.unreadByConversation(userId, ids),
      this.jobRepo.find({
        where: { id: In(convs.map((c) => c.jobId).filter(Boolean) as number[]) },
        relations: ['page'],
      }),
    ]);

    const userIds = new Set<number>();
    members.forEach((m) => userIds.add(m.userId));
    convs.forEach((c) => userIds.add(c.createdBy));
    jobs.forEach((j) => userIds.add(j.createdBy));
    const users = await this.usersById([...userIds]);

    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const lastById = new Map(lastMessages.map((m) => [m.id, m]));

    return Promise.all(
      convs.map(async (c) => {
        const mine = members.find((m) => m.conversationId === c.id && m.userId === userId);
        const job = c.jobId ? jobById.get(c.jobId) : null;
        const asApplicant = c.type === 'job' && c.createdBy === userId;

        // the other side: a DM partner; for a job chat the applicant sees the
        // page (or the poster of a personal job), the employer team sees the applicant
        let other: Record<string, unknown> | null = null;
        let otherUserId: number | undefined;
        if (c.type === 'direct') {
          otherUserId = members.find((m) => m.conversationId === c.id && m.userId !== userId)?.userId;
          other = otherUserId ? { ...personView(users.get(otherUserId)), kind: 'user' } : null;
        } else if (!asApplicant) {
          otherUserId = c.createdBy;
          other = { ...personView(users.get(c.createdBy)), kind: 'user' };
        } else if (job?.page) {
          other = {
            id: job.page.id,
            name: job.page.page_name,
            username: job.page.username,
            profile_photo: job.page.page_logo,
            kind: 'page',
          };
        } else if (job) {
          otherUserId = job.createdBy;
          other = { ...personView(users.get(job.createdBy)), kind: 'user' };
        }

        const blocked = otherUserId
          ? await this.blockedBetween(userId, otherUserId)
          : { byMe: false, byThem: false };

        const last = c.lastMessageId ? lastById.get(c.lastMessageId) : null;
        return {
          id: c.id,
          type: c.type,
          /** job chats: are you the applicant or on the employer side? */
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
      }),
    );
  }

  // ────────────────────────────────────────────────
  // UNREAD / READ / MUTE
  // ────────────────────────────────────────────────

  /** nobody has a read row until they first open a chat: that counts as "read nothing" */
  private async unreadByConversation(userId: number, ids: number[]) {
    const rows = await this.msgRepo
      .createQueryBuilder('msg')
      .leftJoin(
        ConversationMember,
        'cm',
        'cm.conversationId = msg.conversationId AND cm.userId = :userId',
        { userId },
      )
      .select('msg.conversationId', 'conversationId')
      .addSelect('COUNT(*)', 'n')
      .where('msg.conversationId IN (:...ids)', { ids })
      .andWhere('msg.senderId <> :userId AND msg.deletedAt IS NULL')
      .andWhere('msg.id > COALESCE(cm.lastReadMessageId, 0)')
      .groupBy('msg.conversationId')
      .getRawMany();
    return new Map<number, number>(rows.map((r) => [Number(r.conversationId), Number(r.n)]));
  }

  /** unread messages across all chats I can see (the badge) */
  async unreadTotal(userId: number) {
    const row = await this.msgRepo
      .createQueryBuilder('msg')
      .innerJoin(Conversation, 'c', 'c.id = msg.conversationId')
      .leftJoin(Job, 'j', 'j.id = c.jobId')
      .leftJoin(
        ConversationMember,
        'cm',
        'cm.conversationId = msg.conversationId AND cm.userId = :me',
      )
      .select('COUNT(*)', 'n')
      .addSelect('COUNT(DISTINCT msg.conversationId)', 'conversations')
      .where('msg.senderId <> :me AND msg.deletedAt IS NULL')
      .andWhere('msg.id > COALESCE(cm.lastReadMessageId, 0)')
      .andWhere(VISIBLE)
      .setParameters({ me: userId, roles: JOB_TEAM_ROLES })
      .getRawOne();
    return {
      unreadMessages: Number(row?.n ?? 0),
      unreadConversations: Number(row?.conversations ?? 0),
    };
  }

  /** read position only moves forward; tells everybody in the chat live */
  async markRead(userId: number, conversationId: number, messageId?: number) {
    const { conv, member } = await this.requireAccess(conversationId, userId);
    const upTo = Math.min(
      messageId ?? conv.lastMessageId ?? 0,
      conv.lastMessageId ?? 0,
    );
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

  async mute(userId: number, conversationId: number, muted: boolean, hours?: number) {
    const { member } = await this.requireAccess(conversationId, userId);
    const until = !muted
      ? null
      : hours
        ? new Date(Date.now() + hours * 60 * 60 * 1000)
        : FAR_FUTURE;
    await this.memberRepo.update(member.id, { mutedUntil: until });
    return { muted, mutedUntil: until };
  }

  // ────────────────────────────────────────────────

  async usersById(ids: number[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<number, User>();
    const users = await this.userRepo.find({
      where: { id: In(unique) },
      select: ['id', 'firstName', 'lastName', 'username', 'profile_photo'],
    });
    return new Map(users.map((u) => [u.id, u]));
  }
}
