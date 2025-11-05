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
exports.JobService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const job_schema_1 = require("./job.schema");
const mongoose_2 = require("mongoose");
let JobService = class JobService {
    constructor(jobModel) {
        this.jobModel = jobModel;
    }
    async createJob(payload) {
        const job = new this.jobModel(payload);
        return job.save();
    }
    async findNearbyJobs(payload) {
        const { lat, lng, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', radiusKm = 1, } = payload;
        const radiusInKm = radiusKm;
        const skip = (page - 1) * limit;
        const maxLimit = Math.min(limit, 10);
        const query = {
            isActive: true,
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radiusInKm / 6378.1],
                },
            },
        };
        if (search) {
            query.description = { $regex: search, $options: 'i' };
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const jobs = await this.jobModel
            .find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(maxLimit);
        const total = await this.jobModel.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        return {
            data: jobs,
            total,
            totalPages,
            currentPage: page,
        };
    }
    async findJobs(query) {
        const { filter, page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', lat, lng, } = query;
        const skip = (page - 1) * limit;
        const maxLimit = Math.min(limit, 10);
        const conditions = {
            isActive: true,
        };
        if (filter) {
            conditions.filter = filter;
        }
        if (search) {
            conditions.description = { $regex: search, $options: 'i' };
        }
        const pipeline = [];
        if (lat && lng) {
            pipeline.push({
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [+lng, +lat],
                    },
                    distanceField: 'distance',
                    spherical: true,
                    query: conditions,
                },
            });
        }
        else {
            pipeline.push({ $match: conditions });
        }
        if (!lat || !lng) {
            pipeline.push({
                $sort: {
                    [sortBy]: sortOrder === 'asc' ? 1 : -1,
                },
            });
        }
        const countPipeline = [...pipeline, { $count: 'total' }];
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: maxLimit });
        const [jobs, countResult] = await Promise.all([
            this.jobModel.aggregate(pipeline),
            this.jobModel.aggregate(countPipeline),
        ]);
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / maxLimit);
        return {
            data: jobs,
            total,
            totalPages,
            currentPage: page,
        };
    }
};
exports.JobService = JobService;
exports.JobService = JobService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], JobService);
//# sourceMappingURL=job.service.js.map