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
exports.PagesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const pages_schema_1 = require("./pages.schema");
let PagesService = class PagesService {
    constructor(pageModel) {
        this.pageModel = pageModel;
    }
    async createPage(data, userId) {
        const existing = await this.pageModel.findOne({ owner: userId });
        if (existing) {
            throw new common_1.BadRequestException('User already has a company page.');
        }
        const page = new this.pageModel({
            ...data,
            owner: new mongoose_2.Types.ObjectId(userId),
        });
        const savedPage = await page.save();
        return {
            message: 'Company page created successfully',
            data: savedPage,
        };
    }
    async getPages(query, userId) {
        const { page = 1, limit = 20, search = '', mine = false, } = query;
        const filter = {};
        if (search) {
            filter.company_name = { $regex: search, $options: 'i' };
        }
        if (mine && userId) {
            filter.owner = new mongoose_2.Types.ObjectId(userId);
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
    async getPageById(id) {
        const page = await this.pageModel.findById(id);
        if (!page)
            throw new common_1.BadRequestException('Company page not found');
        return page;
    }
    async updatePage(id, data, userId) {
        const page = await this.pageModel.findOneAndUpdate({ _id: id, owner: userId }, data, { new: true });
        if (!page)
            throw new common_1.BadRequestException('Page not found or you are not authorized to update it');
        return {
            message: 'Page updated successfully',
            data: page,
        };
    }
    async deletePage(id, userId) {
        const deleted = await this.pageModel.findOneAndDelete({
            _id: id,
            owner: userId,
        });
        if (!deleted)
            throw new common_1.BadRequestException('Page not found or you are not authorized to delete it');
        return { message: 'Page deleted successfully' };
    }
};
exports.PagesService = PagesService;
exports.PagesService = PagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(pages_schema_1.Page.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PagesService);
//# sourceMappingURL=pages.service.js.map