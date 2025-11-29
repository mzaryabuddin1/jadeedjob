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
const user_entity_1 = require("../users/entities/user.entity");
let RatingService = class RatingService {
    constructor(ratingRepo, appRepo, userRepo) {
        this.ratingRepo = ratingRepo;
        this.appRepo = appRepo;
        this.userRepo = userRepo;
    }
    async rateUser(raterId, jobApplicationId, stars, comment) {
        if (stars < 1 || stars > 5) {
            throw new common_1.BadRequestException('Stars must be between 1 and 5');
        }
        const app = await this.appRepo.findOne({
            where: { id: jobApplicationId },
            relations: ['job', 'applicant', 'job.creator'],
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        if (app.status !== 'accepted')
            throw new common_1.BadRequestException('Rating allowed only after acceptance');
        let targetUserId;
        if (raterId === app.applicantId) {
            targetUserId = app.job.createdBy;
        }
        else if (raterId === app.job.createdBy) {
            targetUserId = app.applicantId;
        }
        else {
            throw new common_1.BadRequestException('You cannot rate this application');
        }
        const exists = await this.ratingRepo.findOne({
            where: { jobApplicationId, givenBy: raterId },
        });
        if (exists)
            throw new common_1.BadRequestException('You already rated for this job');
        const rating = this.ratingRepo.create({
            jobApplicationId,
            givenBy: raterId,
            givenTo: targetUserId,
            stars,
            comment,
        });
        await this.ratingRepo.save(rating);
        await this.updateUserRatingStats(targetUserId);
        return { message: 'Rating submitted', rating };
    }
    async updateUserRatingStats(userId) {
        const ratings = await this.ratingRepo.find({
            where: { givenTo: userId },
        });
        const total = ratings.length;
        const avg = total > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / total : 0;
        await this.userRepo.update(userId, {
            ratingAverage: avg,
            ratingCount: total,
        });
    }
};
exports.RatingService = RatingService;
exports.RatingService = RatingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rating_entity_1.Rating)),
    __param(1, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RatingService);
//# sourceMappingURL=rating.service.js.map