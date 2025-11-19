import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Page } from './entities/page.entity';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
  ) {}

  async createPage(data: any, userId: number) {
    const existing = await this.pageRepo.findOne({
      where: { ownerId: userId },
    });

    if (existing) {
      throw new BadRequestException('User already has a company page.');
    }

    const page = this.pageRepo.create({
      ...data,
      ownerId: userId,
    });

    await this.pageRepo.save(page);

    return {
      message: 'Company page created successfully',
      data: page,
    };
  }

  async getPages(query: any, userId?: number) {
    const {
      page = 1,
      limit = 20,
      search = '',
      mine = false,
    } = query;

    const where: any = {};

    if (search) {
      where.company_name = Like(`%${search}%`);
    }

    if (mine && userId) {
      where.ownerId = userId;
    }

    const [data, total] = await this.pageRepo.findAndCount({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
        limit: Number(limit),
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
      where: { id, ownerId: userId },
    });

    if (!page) {
      throw new BadRequestException(
        'Page not found or you are not authorized to update it',
      );
    }

    await this.pageRepo.update(id, data);

    const updated = await this.pageRepo.findOne({ where: { id } });

    return {
      message: 'Page updated successfully',
      data: updated,
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
