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
exports.RatingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const company_permissions_1 = require("../pages/company-permissions");
const user_entity_1 = require("../users/entities/user.entity");
const rating_entity_1 = require("./entities/rating.entity");
let RatingService = class RatingService {
    constructor(ratingRepo, appRepo, userRepo, companyRepo, memberRepo) {
        this.ratingRepo = ratingRepo;
        this.appRepo = appRepo;
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.memberRepo = memberRepo;
    }
    async rateUser(raterId, jobApplicationId, stars, comment) {
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            throw new common_1.BadRequestException('Stars must be between 1 and 5');
        }
        return this.ratingRepo.manager.transaction(async (manager) => {
            const app = await this.loadApplication(jobApplicationId, manager, true);
            if (app.status !== 'completed') {
                throw new common_1.BadRequestException('Rating is allowed only after completed work');
            }
            const context = await this.resolveRatingContext(app, raterId, manager);
            const existing = await manager.getRepository(rating_entity_1.Rating).findOne({
                where: { jobApplicationId, side: context.side },
                lock: { mode: 'pessimistic_write' },
            });
            if (existing) {
                throw new common_1.BadRequestException('This side has already submitted a rating');
            }
            const rating = await manager.getRepository(rating_entity_1.Rating).save(manager.getRepository(rating_entity_1.Rating).create({
                jobApplicationId,
                givenBy: raterId,
                givenTo: context.targetUserId,
                side: context.side,
                targetType: context.targetType,
                targetUserId: context.targetUserId,
                targetCompanyId: context.targetCompanyId,
                legacyGrandfathered: false,
                stars,
                comment: String(comment || '').trim() || null,
            }));
            await this.updateAggregate(context, manager);
            return {
                message: 'Rating submitted',
                rating: this.formatRating(rating),
            };
        });
    }
    async getMine(applicationId, userId) {
        const app = await this.loadApplication(applicationId);
        const context = await this.resolveRatingContext(app, userId);
        const rating = await this.ratingRepo.findOne({
            where: { jobApplicationId: applicationId, side: context.side },
        });
        return {
            applicationId,
            side: context.side,
            target: {
                type: context.targetType,
                id: String(context.targetCompanyId || context.targetUserId),
            },
            canRate: app.status === 'completed' && !rating,
            rating: rating ? this.formatRating(rating) : null,
        };
    }
    async loadApplication(id, manager = this.appRepo.manager, lock = false) {
        const app = await manager.getRepository(job_application_entity_1.JobApplication).findOne({
            where: { id },
            relations: ['job', 'job.page', 'job.creator', 'applicant'],
            ...(lock ? { lock: { mode: 'pessimistic_write' } } : {}),
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        return app;
    }
    async resolveRatingContext(app, userId, manager = this.appRepo.manager) {
        if (userId === app.applicantId) {
            return app.job.pageId
                ? {
                    side: 'employer',
                    targetType: 'company',
                    targetUserId: null,
                    targetCompanyId: app.job.pageId,
                }
                : {
                    side: 'employer',
                    targetType: 'user',
                    targetUserId: app.job.createdBy,
                    targetCompanyId: null,
                };
        }
        if (!(await this.canRateAsEmployer(app, userId, manager))) {
            throw new common_1.ForbiddenException('You cannot rate this application');
        }
        return {
            side: 'worker',
            targetType: 'user',
            targetUserId: app.applicantId,
            targetCompanyId: null,
        };
    }
    async canRateAsEmployer(app, userId, manager) {
        if (!app.job.pageId)
            return app.job.createdBy === userId;
        const company = app.job.page ||
            (await manager
                .getRepository(company_page_entity_1.CompanyPage)
                .findOne({ where: { id: app.job.pageId } }));
        if (!company || company.verificationStatus !== 'approved')
            return false;
        if (company.ownerId === userId)
            return true;
        const member = await manager.getRepository(page_member_entity_1.PageMember).findOne({
            where: { pageId: company.id, userId, hasAccess: true },
        });
        return Boolean(member &&
            (0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions).viewApplicants);
    }
    async updateAggregate(context, manager) {
        const ratings = await manager.getRepository(rating_entity_1.Rating).find({
            where: context.targetType === 'company'
                ? {
                    targetType: 'company',
                    targetCompanyId: context.targetCompanyId,
                }
                : {
                    targetType: 'user',
                    targetUserId: context.targetUserId,
                },
        });
        const count = ratings.length;
        const average = count
            ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / count
            : 0;
        if (context.targetType === 'company') {
            await manager.getRepository(company_page_entity_1.CompanyPage).update(context.targetCompanyId, { ratingAverage: average, ratingCount: count });
        }
        else {
            await manager.getRepository(user_entity_1.User).update(context.targetUserId, {
                ratingAverage: average,
                ratingCount: count,
            });
        }
    }
    formatRating(rating) {
        return {
            id: rating.id,
            applicationId: rating.jobApplicationId,
            side: rating.side,
            targetType: rating.targetType,
            targetId: String(rating.targetCompanyId || rating.targetUserId),
            stars: rating.stars,
            comment: rating.comment || '',
            createdAt: rating.createdAt,
            legacyGrandfathered: Boolean(rating.legacyGrandfathered),
        };
    }
};
exports.RatingService = RatingService;
exports.RatingService = RatingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rating_entity_1.Rating)),
    __param(1, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(4, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RatingService);
//# sourceMappingURL=rating.service.js.map