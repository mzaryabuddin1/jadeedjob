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
exports.JobApplicationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const job_application_schema_1 = require("./job-application.schema");
const job_schema_1 = require("../job/job.schema");
let JobApplicationService = class JobApplicationService {
    constructor(jobAppModel, jobModel) {
        this.jobAppModel = jobAppModel;
        this.jobModel = jobModel;
    }
    async apply(data) {
        const job = await this.jobModel.findOne({ _id: data.job, isActive: true });
        if (!job) {
            throw new common_1.BadRequestException('Job does not exist or is not active');
        }
        const existing = await this.jobAppModel.findOne({
            job: data.job,
            applicant: data.applicant,
        });
        if (existing) {
            throw new common_1.BadRequestException('You already applied to this job');
        }
        const application = new this.jobAppModel(data);
        return application.save();
    }
    async getApplicationsByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const maxLimit = Math.min(limit, 50);
        const [applications, total] = await Promise.all([
            this.jobAppModel
                .find({ applicant: userId })
                .populate('job')
                .skip(skip)
                .limit(maxLimit),
            this.jobAppModel.countDocuments({ applicant: userId }),
        ]);
        const totalPages = Math.ceil(total / maxLimit);
        return {
            data: applications,
            total,
            totalPages,
            currentPage: page,
        };
    }
    async getApplicationsByJob(jobId) {
        return this.jobAppModel.find({ job: jobId }).populate('applicant');
    }
    async updateStatus(id, status) {
        return this.jobAppModel.findByIdAndUpdate(id, { status }, { new: true });
    }
};
exports.JobApplicationService = JobApplicationService;
exports.JobApplicationService = JobApplicationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_application_schema_1.JobApplication.name)),
    __param(1, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map