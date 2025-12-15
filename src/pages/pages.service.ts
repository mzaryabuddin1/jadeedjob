import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CompanyPage } from './entities/company-page.entity';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(CompanyPage)
    private readonly pageRepo: Repository<CompanyPage>,
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
  const {
    page = 1,
    limit = 20,
    search,
    mine = false,
  } = query;

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
    qb.andWhere(
      '(page.ownerId = :userId OR member.userId = :userId)',
      { userId },
    );
  }

  qb.orderBy('page.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [data, total] = await qb.getManyAndCount();

  return {
    data: data.map((p) => ({
      ...p,
      mine:
        p.ownerId === userId ||
        p.members.some((m) => m.userId === userId),
    })),
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
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
}
