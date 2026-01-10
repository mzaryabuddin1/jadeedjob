import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(CompanyPage)
    private readonly pageRepo: Repository<CompanyPage>,

    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createPage(data: any, userId: number) {
    let username = data.username?.toLowerCase();

    if (username) {
      if (!/^[a-z0-9.-]+$/.test(username)) {
        throw new BadRequestException(
          'Username can only contain a-z, 0-9, dot(.) and dash(-)',
        );
      }

      const exists = await this.pageRepo.findOne({ where: { username } });
      if (exists) throw new BadRequestException('Username already taken');
    } else {
      // 🔥 Auto-generate username
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

  async getPages(query: any, userId: number) {
    const { page = 1, limit = 20, search, mine = false } = query;

    const qb = this.pageRepo
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.members', 'member');

    if (search) {
      qb.andWhere(
        '(page.company_name LIKE :search OR page.username LIKE :search)',
        { search: `%${search}%` },
      );
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

  // ────────────────────────────────────────────────
  // ADD MEMBER TO PAGE
  // ────────────────────────────────────────────────
  async addMember(
    pageId: number,
    targetUserId: number,
    role: 'admin' | 'editor',
    requesterId: number,
  ) {
    if (!['admin', 'editor'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    // requester permission
    const requester =
      page.ownerId === requesterId
        ? { role: 'owner' }
        : page.members.find((m) => m.userId === requesterId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException(
        'You are not allowed to add members to this page',
      );
    }

    // cannot add owner again
    if (targetUserId === page.ownerId) {
      throw new BadRequestException('User is already the owner');
    }

    // check user exists
    const user = await this.userRepo.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new BadRequestException('User not found');

    // check already member
    const exists = page.members.find((m) => m.userId === targetUserId);

    if (exists) {
      throw new BadRequestException('User is already a member');
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

  async getPageById(id: number) {
    const page = await this.pageRepo.findOne({ where: { id } });

    if (!page) {
      throw new BadRequestException('Company page not found');
    }

    return page;
  }

  async updatePage(id: number, data: any, userId: number) {
    const page = await this.pageRepo.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    const member = page.members.find((m) => m.userId === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
      throw new BadRequestException('You are not allowed to update this page');
    }

    await this.pageRepo.update(id, data);

    return {
      message: 'Page updated successfully',
      data: await this.pageRepo.findOne({ where: { id } }),
    };
  }

  async deletePage(id: number, userId: number) {
    const page = await this.pageRepo.findOne({
      where: { id, ownerId: userId },
    });

    if (!page) {
      throw new BadRequestException(
        'Page not found or you are not authorized to delete it',
      );
    }

    await this.pageRepo.delete(id);

    return { message: 'Page deleted successfully' };
  }
  async removeMember(pageId: number, memberId: number, requesterId: number) {
    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    const requester = page.members.find((m) => m.userId === requesterId);
    const target = page.members.find((m) => m.userId === memberId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException('Not authorized');
    }

    if (!target) throw new BadRequestException('Member not found');

    if (target.role === 'owner') {
      throw new BadRequestException('Owner cannot be removed');
    }

    await this.pageRepo.manager.delete('page_members', {
      pageId,
      userId: memberId,
    });

    return { message: 'Member removed successfully' };
  }

  async changeMemberRole(
    pageId: number,
    targetUserId: number,
    newRole: 'admin' | 'editor',
    requesterId: number,
  ) {
    if (!['admin', 'editor'].includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }

    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['members'],
    });

    if (!page) throw new BadRequestException('Page not found');

    // requester role
    const requester =
      page.ownerId === requesterId
        ? { role: 'owner' }
        : page.members.find((m) => m.userId === requesterId);

    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      throw new BadRequestException(
        'You are not allowed to change member roles',
      );
    }

    // owner protection
    if (targetUserId === page.ownerId) {
      throw new BadRequestException('Owner role cannot be changed');
    }

    const target = page.members.find((m) => m.userId === targetUserId);

    if (!target) {
      throw new BadRequestException('Member not found');
    }

    // admin limitations
    if (requester.role === 'admin') {
      // admin cannot change another admin to owner (owner not allowed anyway)
      if (target.role === 'admin' && newRole === 'admin') {
        throw new BadRequestException('No role change required');
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
}
