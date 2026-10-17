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
const rating_entity_1 = require("./entities/rating.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const job_employer_util_1 = require("../job/job-employer.util");
const EMPLOYEE_TO_EMPLOYER = 'employee_to_employer';
const EMPLOYER_TO_EMPLOYEE = 'employer_to_employee';
let RatingService = class RatingService {
    constructor(ratingRepo, appRepo, userRepo, pageRepo) {
        this.ratingRepo = ratingRepo;
        this.appRepo = appRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
    }
    async onModuleInit() {
        try {
            await this.ratingRepo.query(`UPDATE ratings r
         JOIN job_applications a ON a.id = r.jobApplicationId
         SET r.direction = IF(r.givenBy = a.applicantId, '${EMPLOYEE_TO_EMPLOYER}', '${EMPLOYER_TO_EMPLOYEE}')
         WHERE r.direction IS NULL`);
        }
        catch (err) {
            console.warn('[RatingService] direction backfill skipped:', err instanceof Error ? err.message : err);
        }
    }
    async rateUser(raterId, jobApplicationId, stars, comment) {
        if (stars < 1 || stars > 5) {
            throw new common_1.BadRequestException('Stars must be between 1 and 5');
        }
        const app = await this.appRepo.findOne({
            where: { id: jobApplicationId },
            relations: ['job'],
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        if (app.status !== 'accepted')
            throw new common_1.BadRequestException('Rating allowed only after acceptance');
        const direction = await this.directionFor(raterId, app);
        if (!direction) {
            throw new common_1.BadRequestException('You cannot rate this application');
        }
        const already = await this.ratingRepo.findOne({
            where: { jobApplicationId, direction },
        });
        if (already) {
            throw new common_1.BadRequestException(direction === EMPLOYEE_TO_EMPLOYER
                ? 'You already rated this job'
                : 'The employer side already rated this applicant');
        }
        let givenTo;
        let pageId = null;
        if (direction === EMPLOYER_TO_EMPLOYEE) {
            givenTo = app.applicantId;
        }
        else if (app.job.pageId) {
            givenTo = null;
            pageId = app.job.pageId;
        }
        else {
            givenTo = app.job.createdBy;
        }
        const rating = this.ratingRepo.create({
            jobApplicationId,
            givenBy: raterId,
            givenTo,
            pageId,
            direction,
            stars,
            comment,
        });
        try {
            await this.ratingRepo.save(rating);
        }
        catch (err) {
            if (err?.code === 'ER_DUP_ENTRY') {
                throw new common_1.BadRequestException('This application was already rated');
            }
            throw err;
        }
        if (pageId)
            await this.updatePageRatingStats(pageId);
        else
            await this.updateUserRatingStats(givenTo);
        return {
            message: 'Rating submitted',
            rating,
            ratedEntity: pageId
                ? { type: 'page', pageId }
                : { type: 'user', userId: givenTo },
        };
    }
    async directionFor(userId, app) {
        if (userId === app.applicantId)
            return EMPLOYEE_TO_EMPLOYER;
        if (await (0, job_employer_util_1.isJobEmployer)(this.pageRepo, app.job, userId)) {
            return EMPLOYER_TO_EMPLOYEE;
        }
        return null;
    }
    async updateUserRatingStats(userId) {
        const row = await this.ratingRepo
            .createQueryBuilder('r')
            .select('AVG(r.stars)', 'avg')
            .addSelect('COUNT(*)', 'total')
            .where('r.givenTo = :userId', { userId })
            .getRawOne();
        await this.userRepo.update(userId, {
            ratingAverage: Number(row?.avg ?? 0),
            ratingCount: Number(row?.total ?? 0),
        });
    }
    async updatePageRatingStats(pageId) {
        const row = await this.ratingRepo
            .createQueryBuilder('r')
            .select('AVG(r.stars)', 'avg')
            .addSelect('COUNT(*)', 'total')
            .where('r.pageId = :pageId', { pageId })
            .getRawOne();
        await this.pageRepo.update(pageId, {
            page_rating: row?.avg != null ? Number(row.avg) : null,
            page_rating_count: Number(row?.total ?? 0),
        });
    }
    async getUserSummary(userId, limit = 10) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: [
                'id',
                'firstName',
                'lastName',
                'username',
                'profile_photo',
                'ratingAverage',
                'ratingCount',
            ],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const breakdown = await this.ratingRepo
            .createQueryBuilder('r')
            .select('r.direction', 'direction')
            .addSelect('AVG(r.stars)', 'avg')
            .addSelect('COUNT(*)', 'total')
            .where('r.givenTo = :userId', { userId })
            .groupBy('r.direction')
            .getRawMany();
        const part = (direction) => {
            const row = breakdown.find((b) => b.direction === direction);
            return {
                average: row ? Number(row.avg) : 0,
                count: row ? Number(row.total) : 0,
            };
        };
        return {
            user: {
                id: user.id,
                name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
                username: user.username,
                profile_photo: user.profile_photo,
            },
            average: user.ratingAverage,
            count: user.ratingCount,
            asEmployee: part(EMPLOYER_TO_EMPLOYEE),
            asEmployer: part(EMPLOYEE_TO_EMPLOYER),
            recent: await this.recent('r.givenTo = :id', userId, limit),
        };
    }
    async getPageSummary(pageId, limit = 10) {
        const page = await this.pageRepo.findOne({
            where: { id: pageId },
            select: [
                'id',
                'page_name',
                'username',
                'page_logo',
                'page_rating',
                'page_rating_count',
            ],
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return {
            page: {
                id: page.id,
                name: page.page_name,
                username: page.username,
                logo: page.page_logo,
            },
            average: page.page_rating ?? 0,
            count: page.page_rating_count ?? 0,
            recent: await this.recent('r.pageId = :id', pageId, limit),
        };
    }
    async getApplicationRatingState(applicationId, userId) {
        const app = await this.appRepo.findOne({
            where: { id: applicationId },
            relations: ['job'],
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        const direction = await this.directionFor(userId, app);
        if (!direction) {
            throw new common_1.ForbiddenException('You are not part of this application');
        }
        const ratings = await this.ratingRepo.find({
            where: { jobApplicationId: applicationId },
        });
        const iRated = ratings.some((r) => r.direction === direction);
        const otherSideRated = ratings.some((r) => r.direction !== direction);
        return {
            applicationId,
            status: app.status,
            myRole: direction === EMPLOYEE_TO_EMPLOYER ? 'employee' : 'employer',
            willRate: direction === EMPLOYER_TO_EMPLOYEE
                ? { type: 'user', userId: app.applicantId }
                : app.job.pageId
                    ? { type: 'page', pageId: app.job.pageId }
                    : { type: 'user', userId: app.job.createdBy },
            canRate: app.status === 'accepted' && !iRated,
            iRated,
            otherSideRated,
            reason: app.status !== 'accepted'
                ? 'Ratings open after the application is accepted'
                : iRated
                    ? 'You already rated'
                    : '',
        };
    }
    async recent(where, id, limit) {
        const rows = await this.ratingRepo
            .createQueryBuilder('r')
            .leftJoin(job_application_entity_1.JobApplication, 'a', 'a.id = r.jobApplicationId')
            .leftJoin(job_entity_1.Job, 'j', 'j.id = a.jobId')
            .leftJoin(user_entity_1.User, 'u', 'u.id = r.givenBy')
            .select('r.id', 'id')
            .addSelect('r.stars', 'stars')
            .addSelect('r.comment', 'comment')
            .addSelect('r.direction', 'direction')
            .addSelect('r.createdAt', 'createdAt')
            .addSelect('j.title', 'jobTitle')
            .addSelect('u.id', 'raterId')
            .addSelect('u.firstName', 'firstName')
            .addSelect('u.lastName', 'lastName')
            .addSelect('u.username', 'username')
            .where(where, { id })
            .orderBy('r.createdAt', 'DESC')
            .limit(Math.min(50, Math.max(1, limit)))
            .getRawMany();
        return rows.map((r) => ({
            id: r.id,
            stars: Number(r.stars),
            comment: r.comment,
            ratedAs: r.direction === EMPLOYER_TO_EMPLOYEE ? 'employee' : 'employer',
            jobTitle: r.jobTitle,
            from: {
                id: r.raterId,
                name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
                username: r.username,
            },
            createdAt: r.createdAt,
        }));
    }
};
exports.RatingService = RatingService;
exports.RatingService = RatingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rating_entity_1.Rating)),
    __param(1, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RatingService);
//# sourceMappingURL=rating.service.js.map