import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageMember } from './entities/page-member.entity';
import { PageInvitation } from './entities/page-invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';
import { ASSIGNABLE_ROLES } from './page-permissions';
import { PagesService } from './pages.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Giving someone access to a page = invitation -> THEY accept.
 * Nobody becomes a member without saying yes.
 *
 * Env: PAGE_INVITATION_DAYS (default 7), NOTIFICATION_PAGE_INVITATION_PATH
 * (deep link, `{id}` = invitation id, default `/page-invitation/{id}`)
 */
@Injectable()
export class PageInvitationsService {
  constructor(
    @InjectRepository(PageInvitation)
    private readonly inviteRepo: Repository<PageInvitation>,
    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly pagesService: PagesService,
    private readonly notificationService: NotificationService,
  ) {}

  private get validityDays() {
    return Number(process.env.PAGE_INVITATION_DAYS) || 7;
  }

  private displayName(u?: Partial<User> | null) {
    return (
      `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() ||
      u?.username ||
      'Someone'
    );
  }

  // ────────────────────────────────────────────────
  // SEND
  // ────────────────────────────────────────────────

  async invite(
    pageId: number,
    requesterId: number,
    target: { userId?: number; username?: string },
    role: 'admin' | 'editor',
  ) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException('Role must be admin or editor');
    }

    const { page, role: myRole } = await this.pagesService.requirePermission(
      pageId,
      requesterId,
      'members.invite',
      'invite people',
    );
    if (role === 'admin' && myRole !== 'owner') {
      throw new ForbiddenException('Only the owner can invite an admin');
    }

    // who is being invited
    const username = target.username
      ? String(target.username).trim().replace(/^@/, '').toLowerCase()
      : '';
    if (!target.userId && !username) {
      throw new BadRequestException('Send userId or username of the person');
    }
    const invitee = await this.userRepo.findOne({
      where: target.userId ? { id: Number(target.userId) } : { username },
      select: ['id', 'firstName', 'lastName', 'username', 'isBanned'],
    });
    if (!invitee || invitee.isBanned)
      throw new NotFoundException('User not found');

    if (invitee.id === requesterId) {
      throw new BadRequestException('You cannot invite yourself');
    }
    if (
      invitee.id === page.ownerId ||
      page.members.some((m) => m.userId === invitee.id)
    ) {
      throw new BadRequestException(
        'This user is already a member of the page',
      );
    }

    // one open invitation per person: expire stale ones, refuse live ones
    const open = await this.inviteRepo.findOne({
      where: { pageId, invitedUserId: invitee.id, status: 'pending' },
    });
    if (open) {
      if (open.expiresAt.getTime() > Date.now()) {
        throw new BadRequestException(
          'This user already has a pending invitation to this page',
        );
      }
      await this.inviteRepo.update(open.id, { status: 'expired' });
    }

    const invitation = await this.inviteRepo.save(
      this.inviteRepo.create({
        pageId,
        invitedUserId: invitee.id,
        invitedBy: requesterId,
        role,
        status: 'pending',
        expiresAt: new Date(Date.now() + this.validityDays * DAY_MS),
      }),
    );

    const inviter = await this.userRepo.findOne({
      where: { id: requesterId },
      select: ['id', 'firstName', 'lastName', 'username'],
    });
    const template =
      process.env.NOTIFICATION_PAGE_INVITATION_PATH || '/page-invitation/{id}';

    // best effort - never fails the invitation
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

  // ────────────────────────────────────────────────
  // PAGE SIDE: list / cancel
  // ────────────────────────────────────────────────

  async listForPage(pageId: number, requesterId: number) {
    const { page } = await this.pagesService.requirePermission(
      pageId,
      requesterId,
      'members.invite',
      'see invitations',
    );

    const invitations = await this.inviteRepo.find({
      where: { pageId, status: 'pending', expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    const users = await this.usersById(
      invitations.flatMap((i) => [i.invitedUserId, i.invitedBy]),
    );

    return invitations.map((i) =>
      this.toView(i, page, users.get(i.invitedUserId), users.get(i.invitedBy)),
    );
  }

  /** Owner cancels any pending invitation; an admin only editor invitations */
  async cancel(pageId: number, invitationId: number, requesterId: number) {
    const { role } = await this.pagesService.requirePermission(
      pageId,
      requesterId,
      'members.invite',
      'cancel invitations',
    );

    const invitation = await this.inviteRepo.findOne({
      where: { id: invitationId, pageId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `Invitation is already ${invitation.status}`,
      );
    }
    if (role === 'admin' && invitation.role !== 'editor') {
      throw new ForbiddenException(
        'An admin can cancel editor invitations only',
      );
    }

    await this.inviteRepo.update(
      { id: invitationId, status: 'pending' },
      { status: 'cancelled', respondedAt: new Date() },
    );
    return { message: 'Invitation cancelled' };
  }

  // ────────────────────────────────────────────────
  // INVITED USER SIDE: list / accept / decline
  // ────────────────────────────────────────────────

  async listMine(userId: number) {
    const invitations = await this.inviteRepo.find({
      where: {
        invitedUserId: userId,
        status: 'pending',
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    if (!invitations.length) return [];

    const pages = await this.pageRepo.find({
      where: { id: In(invitations.map((i) => i.pageId)) },
    });
    const pageById = new Map(pages.map((p) => [p.id, p]));
    const users = await this.usersById(invitations.map((i) => i.invitedBy));

    return invitations
      .filter((i) => pageById.has(i.pageId))
      .map((i) =>
        this.toView(
          i,
          pageById.get(i.pageId),
          undefined,
          users.get(i.invitedBy),
        ),
      );
  }

  /** Only the invited user can accept - this is what grants the access */
  async accept(invitationId: number, userId: number) {
    const invitation = await this.loadMine(invitationId, userId);

    const pageId = invitation.pageId;
    const result = await this.pageRepo.manager.transaction(async (manager) => {
      // lock the page: two accepts / a concurrent removal cannot double-add
      const page = await manager
        .createQueryBuilder(Page, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :pageId', { pageId })
        .getOne();
      if (!page) throw new NotFoundException('This page no longer exists');

      const already =
        page.ownerId === userId ||
        (await manager.exists(PageMember, { where: { pageId, userId } }));
      if (already) throw new BadRequestException('You are already a member');

      const claimed = await manager.update(
        PageInvitation,
        { id: invitationId, status: 'pending' },
        { status: 'accepted', respondedAt: new Date() },
      );
      if (!claimed.affected) {
        throw new BadRequestException('This invitation was already answered');
      }

      await manager.save(
        manager.create(PageMember, { pageId, userId, role: invitation.role }),
      );
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
        path: (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace(
          '{id}',
          String(pageId),
        ),
      },
    });

    return {
      message: `You now have ${invitation.role} access to "${result.page_name}"`,
      data: { pageId, role: invitation.role },
    };
  }

  async decline(invitationId: number, userId: number) {
    await this.loadMine(invitationId, userId);

    const res = await this.inviteRepo.update(
      { id: invitationId, status: 'pending' },
      { status: 'declined', respondedAt: new Date() },
    );
    if (!res.affected) {
      throw new BadRequestException('This invitation was already answered');
    }
    return { message: 'Invitation declined' };
  }

  // ────────────────────────────────────────────────
  // helpers
  // ────────────────────────────────────────────────

  /** The invitation, if it is addressed to this user and still usable */
  private async loadMine(invitationId: number, userId: number) {
    const invitation = await this.inviteRepo.findOne({
      where: { id: invitationId },
    });
    // do not reveal other people's invitations
    if (!invitation || invitation.invitedUserId !== userId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `Invitation is already ${invitation.status}`,
      );
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.inviteRepo.update(invitation.id, { status: 'expired' });
      throw new BadRequestException('This invitation has expired');
    }
    return invitation;
  }

  private async usersById(ids: number[]) {
    const unique = [...new Set(ids)];
    const users = unique.length
      ? await this.userRepo.find({
          where: { id: In(unique) },
          select: ['id', 'firstName', 'lastName', 'username', 'profile_photo'],
        })
      : [];
    return new Map(users.map((u) => [u.id, u]));
  }

  private toView(
    i: PageInvitation,
    page?: Page,
    invitee?: Partial<User>,
    inviter?: Partial<User> | null,
  ) {
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
}
