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
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const profile_block_entity_1 = require("../profiles/entities/profile-block.entity");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const profile_format_util_1 = require("../profiles/profile-format.util");
const reel_creator_follow_entity_1 = require("../reels/entities/reel-creator-follow.entity");
const reel_report_entity_1 = require("../reels/entities/reel-report.entity");
const reel_entity_1 = require("../reels/entities/reel.entity");
const user_entity_1 = require("../users/entities/user.entity");
let ModerationService = class ModerationService {
    constructor(blockRepo, followRepo, legacyFollowRepo, userRepo, companyRepo, reelRepo, reportRepo) {
        this.blockRepo = blockRepo;
        this.followRepo = followRepo;
        this.legacyFollowRepo = legacyFollowRepo;
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.reelRepo = reelRepo;
        this.reportRepo = reportRepo;
    }
    parseProfileType(value) {
        if (value !== 'user' && value !== 'company') {
            throw new common_1.BadRequestException('Invalid profile type');
        }
        return value;
    }
    async block(blockerUserId, profileTypeValue, profileId) {
        const profileType = this.parseProfileType(profileTypeValue);
        await this.assertTargetExists(profileType, profileId);
        if (profileType === 'user' && blockerUserId === profileId) {
            throw new common_1.BadRequestException('You cannot block yourself');
        }
        await this.blockRepo.manager.transaction(async (manager) => {
            await manager
                .getRepository(profile_block_entity_1.ProfileBlock)
                .createQueryBuilder()
                .insert()
                .values({ blockerUserId, profileType, profileId })
                .orIgnore()
                .execute();
            const follows = manager.getRepository(profile_follow_entity_1.ProfileFollow);
            await follows.delete({ followerUserId: blockerUserId, profileType, profileId });
            if (profileType === 'user') {
                await follows.delete({
                    followerUserId: profileId,
                    profileType: 'user',
                    profileId: blockerUserId,
                });
                const legacy = manager.getRepository(reel_creator_follow_entity_1.ReelCreatorFollow);
                await legacy.delete([
                    { followerId: blockerUserId, creatorId: profileId },
                    { followerId: profileId, creatorId: blockerUserId },
                ]);
            }
        });
        return { profileType, profileId: String(profileId), blocked: true };
    }
    async unblock(blockerUserId, profileTypeValue, profileId) {
        const profileType = this.parseProfileType(profileTypeValue);
        await this.blockRepo.delete({ blockerUserId, profileType, profileId });
        return { profileType, profileId: String(profileId), blocked: false };
    }
    async listBlocked(userId, page = 1, limit = 20) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [blocks, total] = await this.blockRepo.findAndCount({
            where: { blockerUserId: userId },
            order: { createdAt: 'DESC' },
            skip: (currentPage - 1) * take,
            take,
        });
        const userIds = blocks
            .filter((item) => item.profileType === 'user')
            .map((item) => item.profileId);
        const companyIds = blocks
            .filter((item) => item.profileType === 'company')
            .map((item) => item.profileId);
        const [users, companies] = await Promise.all([
            userIds.length ? this.userRepo.findBy({ id: (0, typeorm_2.In)(userIds) }) : [],
            companyIds.length ? this.companyRepo.findBy({ id: (0, typeorm_2.In)(companyIds) }) : [],
        ]);
        const userMap = new Map(users.map((item) => [item.id, item]));
        const companyMap = new Map(companies.map((item) => [item.id, item]));
        return {
            data: blocks
                .map((item) => {
                const target = item.profileType === 'user'
                    ? userMap.get(item.profileId)
                    : companyMap.get(item.profileId);
                if (!target)
                    return null;
                return {
                    ...(item.profileType === 'user'
                        ? (0, profile_format_util_1.formatUserPublisher)(target)
                        : (0, profile_format_util_1.formatCompanyPublisher)(target)),
                    blockedAt: item.createdAt,
                };
            })
                .filter(Boolean),
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async isInteractionBlocked(viewerId, targetType, targetId) {
        const direct = await this.blockRepo.findOne({
            where: {
                blockerUserId: viewerId,
                profileType: targetType,
                profileId: targetId,
            },
        });
        if (direct)
            return true;
        if (targetType !== 'user')
            return false;
        return Boolean(await this.blockRepo.findOne({
            where: {
                blockerUserId: targetId,
                profileType: 'user',
                profileId: viewerId,
            },
        }));
    }
    async assertInteractionAllowed(viewerId, targetType, targetId) {
        if (await this.isInteractionBlocked(viewerId, targetType, targetId)) {
            throw new common_1.ForbiddenException({
                code: 'PROFILE_BLOCKED',
                message: 'This action is unavailable because of a blocked relationship',
            });
        }
    }
    async blockedTargets(userId) {
        const [own, reverse] = await Promise.all([
            this.blockRepo.find({ where: { blockerUserId: userId } }),
            this.blockRepo.find({
                where: { profileType: 'user', profileId: userId },
            }),
        ]);
        return {
            userIds: [
                ...new Set([
                    ...own
                        .filter((item) => item.profileType === 'user')
                        .map((item) => item.profileId),
                    ...reverse.map((item) => item.blockerUserId),
                ]),
            ],
            companyIds: [
                ...new Set(own
                    .filter((item) => item.profileType === 'company')
                    .map((item) => item.profileId)),
            ],
        };
    }
    async reportReel(reelId, reporterUserId, body) {
        const reel = await this.reelRepo.findOne({ where: { id: reelId } });
        if (!reel || reel.deletedAt || reel.status === 'deleted') {
            throw new common_1.NotFoundException('Reel not found');
        }
        if (await this.reportRepo.findOne({
            where: { reelId, reporterUserId },
        })) {
            throw new common_1.ConflictException('Reel already reported');
        }
        const report = await this.reportRepo.save(this.reportRepo.create({
            reelId,
            reporterUserId,
            reason: body.reason,
            details: body.details || null,
        }));
        return { reportId: report.id, status: report.status };
    }
    async listReelReports(status = 'pending', page = 1, limit = 20) {
        const currentPage = Math.max(1, Number(page) || 1);
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const [data, total] = await this.reportRepo.findAndCount({
            where: status === 'all' ? {} : { status },
            order: { createdAt: 'DESC' },
            skip: (currentPage - 1) * take,
            take,
        });
        return {
            data,
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async resolveReelReport(reportId, adminId, status, resolutionNote) {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report)
            throw new common_1.NotFoundException('Reel report not found');
        report.status = status;
        report.resolvedByAdminId = adminId;
        report.resolutionNote = resolutionNote || null;
        report.resolvedAt = new Date();
        return this.reportRepo.save(report);
    }
    async assertTargetExists(type, id) {
        const target = type === 'user'
            ? await this.userRepo.findOne({ where: { id } })
            : await this.companyRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('Profile not found');
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(profile_block_entity_1.ProfileBlock)),
    __param(1, (0, typeorm_1.InjectRepository)(profile_follow_entity_1.ProfileFollow)),
    __param(2, (0, typeorm_1.InjectRepository)(reel_creator_follow_entity_1.ReelCreatorFollow)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(5, (0, typeorm_1.InjectRepository)(reel_entity_1.Reel)),
    __param(6, (0, typeorm_1.InjectRepository)(reel_report_entity_1.ReelReport)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map