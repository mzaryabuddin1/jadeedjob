import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageMember } from './entities/page-member.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import {
  ASSIGNABLE_ROLES,
  PAGE_PERMISSIONS,
  PagePermission,
  PageRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from './page-permissions';
import { EDITABLE_PAGE_FIELDS, toPageView } from './page-view';
import { PageVerificationService } from './page-verification.service';
import { FollowService } from 'src/follow/follow.service';
import { Post, countContent } from 'src/posts/entities/post.entity';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,38}[a-z0-9]$/;

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,

    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly verificationService: PageVerificationService,

    private readonly followService: FollowService,

    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
  ) {}

  // ────────────────────────────────────────────────
  // ACCESS HELPERS (used here and by the invitation / verification services)
  // ────────────────────────────────────────────────

  /** Role of `userId` on this page: owner, a member role, or null */
  roleOf(page: Page, userId: number): PageRole | null {
    if (page.ownerId === userId) return 'owner';
    return (page.members || []).find((m) => m.userId === userId)?.role ?? null;
  }

  async requirePage(id: number): Promise<Page> {
    const page = await this.pageRepo.findOne({
      where: { id },
      relations: ['members'],
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  /** Load the page and make sure the user's role allows `permission` */
  async requirePermission(
    pageId: number,
    userId: number,
    permission: PagePermission,
    action = 'do this',
  ): Promise<{ page: Page; role: PageRole }> {
    const page = await this.requirePage(pageId);
    const role = this.roleOf(page, userId);
    if (!roleHasPermission(role, permission)) {
      throw new ForbiddenException(`Your role on this page cannot ${action}`);
    }
    return { page, role: role as PageRole };
  }

  /** Roles and what each can do - handy for the "manage access" screen */
  getRoles() {
    return {
      assignable: ASSIGNABLE_ROLES,
      roles: Object.fromEntries(
        (Object.keys(ROLE_PERMISSIONS) as PageRole[]).map((r) => [
          r,
          ROLE_PERMISSIONS[r],
        ]),
      ),
      allPermissions: PAGE_PERMISSIONS,
      rules: [
        'Only the owner can invite someone as admin or change roles',
        'An admin can invite and remove editors only',
        'The owner cannot be removed, demoted or leave; delete the page instead',
        'Nobody joins without accepting an invitation',
      ],
    };
  }

  // ────────────────────────────────────────────────
  // PAGE CRUD
  // ────────────────────────────────────────────────

  private async uniqueUsername(base: string): Promise<string> {
    let candidate = base;
    let counter = 0;
    while (await this.pageRepo.exist({ where: { username: candidate } })) {
      counter++;
      candidate = `${base}-${counter}`;
    }
    return candidate;
  }

  async createPage(data: any, userId: number) {
    let username: string = data.username?.toLowerCase();

    if (username) {
      if (!USERNAME_PATTERN.test(username)) {
        throw new BadRequestException(
          'Page username: 3-40 characters, a-z, 0-9, dot and dash, starting and ending with a letter or number',
        );
      }
      if (await this.pageRepo.exist({ where: { username } })) {
        throw new ConflictException('Username already taken');
      }
    } else {
      const base =
        String(data.page_name)
          .toLowerCase()
          .replace(/[^a-z0-9.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 36) || 'page';
      username = await this.uniqueUsername(
        base.length >= 3 ? base : `${base}-page`,
      );
    }

    const page = this.pageRepo.create({
      ...data,
      username,
      ownerId: userId,
      is_verified: false,
      verification_status: 'none',
      members: [{ userId, role: 'owner' }],
    } as Partial<Page>);

    const saved = (await this.pageRepo.save(page)) as unknown as Page;
    const created = await this.requirePage(saved.id);

    return {
      message: 'Page created successfully',
      data: toPageView(created, 'owner'),
    };
  }

  async getPages(query: any, userId: number) {
    const search = query.search ? String(query.search).trim() : '';
    const mine = ['true', '1', true].includes(query.mine);
    const verifiedOnly = ['true', '1', true].includes(query.verified);
    const currentPage = Math.max(1, Number(query.page) || 1);
    const take = Math.min(50, Math.max(1, Number(query.limit) || 20));

    const qb = this.pageRepo.createQueryBuilder('page');

    if (search) {
      qb.andWhere(
        '(page.page_name LIKE :search OR page.username LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (verifiedOnly) qb.andWhere('page.is_verified = true');
    if (mine) {
      qb.andWhere(
        '(page.ownerId = :userId OR EXISTS (SELECT 1 FROM page_members pm WHERE pm.pageId = page.id AND pm.userId = :userId))',
        { userId },
      );
    }

    qb.orderBy('page.createdAt', 'DESC')
      .skip((currentPage - 1) * take)
      .take(take);

    const [pages, total] = await qb.getManyAndCount();

    // the viewer's role on each page of this result
    const memberships = pages.length
      ? await this.memberRepo
          .createQueryBuilder('m')
          .where('m.userId = :userId', { userId })
          .andWhere('m.pageId IN (:...ids)', { ids: pages.map((p) => p.id) })
          .getMany()
      : [];
    const roleByPage = new Map(memberships.map((m) => [m.pageId, m.role]));

    const followed = await this.followService.followedSet(
      userId,
      'page',
      pages.map((p) => p.id),
    );

    return {
      data: pages.map((p) => {
        const role: PageRole | null =
          p.ownerId === userId ? 'owner' : (roleByPage.get(p.id) ?? null);
        return { ...toPageView(p, role), isFollowing: followed.has(p.id) };
      }),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async getPageById(id: number, userId: number) {
    const page = await this.requirePage(id);
    return {
      ...toPageView(page, this.roleOf(page, userId)),
      isFollowing: await this.followService.isFollowing(userId, 'page', id),
      ...(await countContent(this.postRepo, { pageId: id })),
    };
  }

  async updatePage(id: number, data: any, userId: number) {
    const { page } = await this.requirePermission(
      id,
      userId,
      'page.edit',
      'edit this page',
    );

    const patch: Record<string, any> = {};
    for (const f of EDITABLE_PAGE_FIELDS) {
      if (data[f] !== undefined) patch[f] = data[f];
    }

    if (data.username !== undefined) {
      const username = String(data.username).toLowerCase();
      if (!USERNAME_PATTERN.test(username)) {
        throw new BadRequestException(
          'Page username: 3-40 characters, a-z, 0-9, dot and dash, starting and ending with a letter or number',
        );
      }
      if (username !== page.username) {
        const taken = await this.pageRepo.findOne({
          where: { username },
          select: ['id'],
        });
        if (taken && taken.id !== id) {
          throw new ConflictException('Username already taken');
        }
        patch.username = username;
      }
    }

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Nothing to update');
    }

    await this.pageRepo.update(id, patch);

    return {
      message: 'Page updated successfully',
      data: await this.getPageById(id, userId),
    };
  }

  /**
   * Owner only. The page's jobs are kept but detached and deactivated (they
   * must not keep running under a page that no longer exists); invitations,
   * verification requests/documents and page ratings are removed with it.
   */
  async deletePage(id: number, userId: number) {
    await this.requirePermission(id, userId, 'page.delete', 'delete this page');

    await this.verificationService.deleteFilesForPage(id);

    await this.pageRepo.manager.transaction(async (manager) => {
      await manager.update(Job, { pageId: id }, {
        isActive: false,
        pageId: null,
      } as any);
      await manager.delete(Page, id);
    });

    return { message: 'Page deleted successfully' };
  }

  // ────────────────────────────────────────────────
  // MEMBERS
  // ────────────────────────────────────────────────

  async listMembers(pageId: number, requesterId: number) {
    const { page } = await this.requirePermission(
      pageId,
      requesterId,
      'members.view',
      'see the members',
    );

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
    // older pages may lack the owner's member row
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

  /** Only the owner changes roles (promote editor -> admin, demote admin -> editor) */
  async changeMemberRole(
    pageId: number,
    targetUserId: number,
    newRole: 'admin' | 'editor',
    requesterId: number,
  ) {
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
      throw new BadRequestException('Role must be admin or editor');
    }
    const { page } = await this.requirePermission(
      pageId,
      requesterId,
      'members.change_role',
      'change roles',
    );

    if (targetUserId === page.ownerId) {
      throw new BadRequestException('The owner role cannot be changed');
    }
    const target = page.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === newRole) {
      throw new BadRequestException(`User is already ${newRole}`);
    }

    await this.memberRepo.update(target.id, { role: newRole });

    return {
      message: 'Member role updated successfully',
      data: { pageId, userId: targetUserId, role: newRole },
    };
  }

  /** Owner removes anybody (not themself); an admin removes editors only */
  async removeMember(
    pageId: number,
    targetUserId: number,
    requesterId: number,
  ) {
    if (targetUserId === requesterId) {
      return this.leavePage(pageId, requesterId);
    }

    const { page, role } = await this.requirePermission(
      pageId,
      requesterId,
      'members.remove',
      'remove members',
    );

    if (targetUserId === page.ownerId) {
      throw new BadRequestException('The owner cannot be removed');
    }
    const target = page.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('Member not found');

    if (role === 'admin' && target.role !== 'editor') {
      throw new ForbiddenException('An admin can remove editors only');
    }

    await this.memberRepo.delete(target.id);
    return { message: 'Member removed successfully' };
  }

  async leavePage(pageId: number, userId: number) {
    const page = await this.requirePage(pageId);
    if (page.ownerId === userId) {
      throw new BadRequestException(
        'The owner cannot leave the page. Delete the page instead',
      );
    }
    const me = page.members.find((m) => m.userId === userId);
    if (!me) throw new BadRequestException('You are not a member of this page');

    await this.memberRepo.delete(me.id);
    return { message: 'You left the page' };
  }
}
