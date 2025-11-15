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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobApplicationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let JobApplicationService = class JobApplicationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async apply(data) {
        const job = await this.prisma.job.findFirst({
            where: { id: data.jobId, isActive: true },
        });
        if (!job) {
            throw new common_1.BadRequestException('Job does not exist or is not active');
        }
        const existing = await this.prisma.jobApplication.findFirst({
            where: {
                jobId: data.jobId,
                applicantId: data.applicantId,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('You already applied to this job');
        }
        return this.prisma.jobApplication.create({
            data,
        });
    }
    async getApplicationsByUser(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [applications, total] = await Promise.all([
            this.prisma.jobApplication.findMany({
                where: { applicantId: userId },
                include: { job: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.jobApplication.count({
                where: { applicantId: userId },
            }),
        ]);
        return {
            data: applications,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async getApplicationsByJob(jobId) {
        return this.prisma.jobApplication.findMany({
            where: { jobId },
            include: { applicant: true },
        });
    }
    async updateStatus(id, status) {
        return this.prisma.jobApplication.update({
            where: { id },
            data: { status },
        });
    }
};
exports.JobApplicationService = JobApplicationService;
exports.JobApplicationService = JobApplicationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobApplicationService);
//# sourceMappingURL=job-application.service.js.map