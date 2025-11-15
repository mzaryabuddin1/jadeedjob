// src/pages/pages.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createPage(data: any, userId: number) {
    const existing = await this.prisma.page.findFirst({
      where: { ownerId: userId },
    });

    if (existing) {
      throw new BadRequestException('User already has a company page.');
    }

    const page = await this.prisma.page.create({
      data: {
        ...data,
        ownerId: userId,
      },
    });

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
      where.company_name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (mine && userId) {
      where.ownerId = userId;
    }

    const total = await this.prisma.page.count({ where });

    const data = await this.prisma.page.findMany({
      where,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      orderBy: { createdAt: 'desc' },
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
    const page = await this.prisma.page.findUnique({
      where: { id },
    });

    if (!page) throw new BadRequestException('Company page not found');

    return page;
  }

  async updatePage(id: number, data: any, userId: number) {
    const page = await this.prisma.page.findFirst({
      where: { id, ownerId: userId },
    });

    if (!page) {
      throw new BadRequestException(
        'Page not found or you are not authorized to update it',
      );
    }

    const updated = await this.prisma.page.update({
      where: { id },
      data,
    });

    return {
      message: 'Page updated successfully',
      data: updated,
    };
  }

  async deletePage(id: number, userId: number) {
    const page = await this.prisma.page.findFirst({
      where: { id, ownerId: userId },
    });

    if (!page) {
      throw new BadRequestException(
        'Page not found or you are not authorized to delete it',
      );
    }

    await this.prisma.page.delete({ where: { id } });

    return { message: 'Page deleted successfully' };
  }
}
