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
exports.FilterService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const filter_schema_1 = require("./filter.schema");
const mongoose_2 = require("mongoose");
const job_schema_1 = require("../job/job.schema");
let FilterService = class FilterService {
    constructor(filterModel, jobModel) {
        this.filterModel = filterModel;
        this.jobModel = jobModel;
    }
    async createFilter(data) {
        const filter = new this.filterModel(data);
        return filter.save();
    }
    async getFilters(query) {
        const { page = 1, limit = 20, search, preference_ids = [], sortBy = 'createdAt', sortOrder = 'desc', approvalStatus = null, } = query;
        const filterCondition = {};
        if (search) {
            filterCondition.name = { $regex: search, $options: 'i' };
        }
        if (approvalStatus) {
            filterCondition.approvalStatus = approvalStatus;
        }
        const sortCondition = {};
        sortCondition[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const preferenceObjectIds = preference_ids?.length > 0
            ? preference_ids.map((id) => new mongoose_2.Types.ObjectId(id))
            : [];
        const total = await this.filterModel.countDocuments(filterCondition);
        const totalPages = Math.ceil(total / limit);
        const baseQuery = this.filterModel.aggregate([
            { $match: filterCondition },
            {
                $lookup: {
                    from: 'jobs',
                    let: { filterId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$filter', '$$filterId'] } } },
                        { $match: { isActive: true } },
                    ],
                    as: 'jobs',
                },
            },
            {
                $addFields: {
                    jobCount: { $size: '$jobs' },
                    isPreferred: {
                        $in: ['$_id', preferenceObjectIds],
                    },
                },
            },
            { $project: { jobs: 0 } },
            { $sort: sortCondition },
            { $skip: skip },
            { $limit: limit },
        ]);
        const results = await baseQuery.exec();
        return {
            data: results,
            total,
            totalPages,
            currentPage: Number(page),
        };
    }
    async FilterById(id) {
        const filter = await this.filterModel.findById(id).exec();
        if (!filter) {
            throw new common_1.NotFoundException('Filter not found');
        }
        return filter;
    }
};
exports.FilterService = FilterService;
exports.FilterService = FilterService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(filter_schema_1.Filter.name)),
    __param(1, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], FilterService);
//# sourceMappingURL=filter.service.js.map