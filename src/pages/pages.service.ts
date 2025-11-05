import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Page } from './pages.schema';

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name) private readonly pageModel: Model<Page>,
  ) {}

  async createPage(data: any, userId: string) {
    const existing = await this.pageModel.findOne({ owner: userId });
    if (existing) {
      throw new BadRequestException('User already has a company page.');
    }

    const page = new this.pageModel({
      ...data,
      owner: new Types.ObjectId(userId),
    });

    const savedPage = await page.save();

    return {
      message: 'Company page created successfully',
      data: savedPage,
    };
  }

  async getPages(query: any, userId?: string) {
    const {
      page = 1,
      limit = 20,
      search = '',
      mine = false, // 👈 optional flag
    } = query;

    // ✅ Build filter condition
    const filter: any = {};

    if (search) {
      filter.company_name = { $regex: search, $options: 'i' };
    }

    // ✅ If "mine" is true → only return pages owned by logged-in user
    if (mine && userId) {
      filter.owner = new Types.ObjectId(userId);
    }

    const total = await this.pageModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const data = await this.pageModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      pagination: {
        total,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
      },
    };
  }

  async getPageById(id: string) {
    const page = await this.pageModel.findById(id);
    if (!page) throw new BadRequestException('Company page not found');
    return page;
  }

  async updatePage(id: string, data: any, userId: string) {
    const page = await this.pageModel.findOneAndUpdate(
      { _id: id, owner: userId },
      data,
      { new: true },
    );

    if (!page)
      throw new BadRequestException(
        'Page not found or you are not authorized to update it',
      );

    return {
      message: 'Page updated successfully',
      data: page,
    };
  }

  async deletePage(id: string, userId: string) {
    const deleted = await this.pageModel.findOneAndDelete({
      _id: id,
      owner: userId,
    });

    if (!deleted)
      throw new BadRequestException(
        'Page not found or you are not authorized to delete it',
      );

    return { message: 'Page deleted successfully' };
  }
}
