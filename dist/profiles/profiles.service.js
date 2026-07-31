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
exports.ProfilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const reel_creator_follow_entity_1 = require("../reels/entities/reel-creator-follow.entity");
const company_permissions_1 = require("../pages/company-permissions");
const profile_follow_entity_1 = require("./entities/profile-follow.entity");
const profile_format_util_1 = require("./profile-format.util");
const moderation_service_1 = require("../moderation/moderation.service");
const object_storage_service_1 = require("../storage/object-storage.service");
let ProfilesService = class ProfilesService {
    constructor(followRepo, legacyFollowRepo, userRepo, pageRepo, moderationService, storageService) {
        this.followRepo = followRepo;
        this.legacyFollowRepo = legacyFollowRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.moderationService = moderationService;
        this.storageService = storageService;
    }
    async searchProfiles(query, viewerId) {
        const profileType = this.parseProfileType(query.profileType);
        const q = query.q.trim().toLowerCase();
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(30, Math.max(1, Number(query.limit) || 20));
        if (profileType === 'user') {
            return this.searchUsers(q, page, limit, viewerId);
        }
        return this.searchCompanies(q, page, limit, viewerId);
    }
    async getProfile(profileType, profileId, viewerId) {
        const type = this.parseProfileType(profileType);
        await this.moderationService.assertInteractionAllowed(viewerId, type, profileId);
        if (type === 'user') {
            return this.getUserProfile(profileId, viewerId);
        }
        return this.getCompanyProfile(profileId, viewerId);
    }
    async follow(profileType, profileId, followerUserId) {
        const type = this.parseProfileType(profileType);
        await this.assertTargetViewable(type, profileId);
        await this.moderationService.assertInteractionAllowed(followerUserId, type, profileId);
        if (type === 'user' && profileId === followerUserId) {
            throw new common_1.BadRequestException('You cannot follow yourself');
        }
        await this.followRepo.manager.transaction(async (manager) => {
            await manager
                .getRepository(profile_follow_entity_1.ProfileFollow)
                .createQueryBuilder()
                .insert()
                .into(profile_follow_entity_1.ProfileFollow)
                .values({ followerUserId, profileType: type, profileId })
                .orIgnore()
                .execute();
            if (type === 'user') {
                await manager
                    .getRepository(reel_creator_follow_entity_1.ReelCreatorFollow)
                    .createQueryBuilder()
                    .insert()
                    .into(reel_creator_follow_entity_1.ReelCreatorFollow)
                    .values({ creatorId: profileId, followerId: followerUserId })
                    .orIgnore()
                    .execute();
            }
        });
        return this.followResponse(type, profileId, true);
    }
    async unfollow(profileType, profileId, followerUserId) {
        const type = this.parseProfileType(profileType);
        await this.followRepo.manager.transaction(async (manager) => {
            await manager.getRepository(profile_follow_entity_1.ProfileFollow).delete({
                followerUserId,
                profileType: type,
                profileId,
            });
            if (type === 'user') {
                await manager.getRepository(reel_creator_follow_entity_1.ReelCreatorFollow).delete({
                    creatorId: profileId,
                    followerId: followerUserId,
                });
            }
        });
        return this.followResponse(type, profileId, false);
    }
    async getUserProfile(userId, viewerId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user.isBanned)
            throw new common_1.NotFoundException('Profile not found');
        const [followersCount, following] = await Promise.all([
            this.followRepo.count({
                where: { profileType: 'user', profileId: userId },
            }),
            this.isFollowing(viewerId, 'user', userId),
        ]);
        const publisher = (0, profile_format_util_1.formatUserPublisher)(user);
        const skills = Array.from(new Set([
            ...(user.skills || []),
            ...(user.technical_skills || []),
            ...(user.soft_skills || []),
        ]));
        return {
            profile: {
                ...publisher,
                avatarUri: await this.userAvatarUrl(user),
                subtitle: user.work_experience?.find((item) => item.currently_working)
                    ?.designation,
                location: this.formatLocation(user.city, user.state, user.country?.name),
                bio: user.professional_summary || undefined,
                rating: {
                    average: Number(user.ratingAverage || 0),
                    count: Number(user.ratingCount || 0),
                },
                followersCount,
                skills,
                skillGroups: {
                    core: user.skills || [],
                    technical: user.technical_skills || [],
                    soft: user.soft_skills || [],
                },
                workExperience: (user.work_experience || []).map((item) => ({
                    companyName: item.company_name,
                    designation: item.designation,
                    department: item.department,
                    employmentType: item.employment_type,
                    fromDate: item.from_date,
                    toDate: item.to_date,
                    keyResponsibilities: item.key_responsibilities,
                    currentlyWorking: Boolean(item.currently_working),
                })),
                education: (user.education || []).map((item) => ({
                    id: item.id,
                    qualification: item.highest_qualification,
                    institution: item.institution_name,
                    graduationYear: item.graduation_year,
                    grade: item.gpa_or_grade,
                })),
                certifications: (user.certifications || []).map((item) => ({
                    id: item.id,
                    name: item.certification_name,
                    issuer: item.issuing_institution,
                    issuedAt: item.certification_date,
                })),
                languages: (user.languages_spoken || []).map((item) => ({
                    name: item.language,
                    level: item.level,
                })),
                socialLinks: {
                    linkedin: user.linkedin_url || null,
                    github: user.github_url || null,
                    portfolio: user.portfolio_url || null,
                    behance: user.behance_url || null,
                },
            },
            viewerState: {
                following,
                isSelf: userId === viewerId,
                canManage: userId === viewerId,
            },
        };
    }
    async getCompanyProfile(companyId, viewerId) {
        const company = await this.pageRepo.findOne({
            where: { id: companyId },
            relations: ['members', 'branches'],
        });
        if (!company || company.verificationStatus !== 'approved') {
            throw new common_1.NotFoundException('Profile not found');
        }
        const member = company.ownerId === viewerId
            ? { role: 'owner', hasAccess: true, permissions: null }
            : company.members?.find((item) => item.userId === viewerId);
        const canManage = Boolean(member &&
            member.hasAccess !== false &&
            (0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions).manageTeam);
        const [followersCount, following] = await Promise.all([
            this.followRepo.count({
                where: { profileType: 'company', profileId: companyId },
            }),
            this.isFollowing(viewerId, 'company', companyId),
        ]);
        return {
            profile: {
                ...(0, profile_format_util_1.formatCompanyPublisher)(company),
                avatarUri: company.logoAssetId
                    ? await this.storageService.getUrl(company.logoAssetId)
                    : company.company_logo || null,
                subtitle: company.industry_type || undefined,
                location: this.formatLocation(company.city, company.state, company.country),
                bio: company.company_description || undefined,
                rating: {
                    average: Number(company.ratingAverage || 0),
                    count: Number(company.ratingCount || 0),
                },
                followersCount,
                foundedYear: company.founded_year || undefined,
                employeeCount: company.number_of_employees || undefined,
                companyType: company.company_type || undefined,
                certifications: company.certifications || [],
                locations: Array.from(new Set([
                    this.formatLocation(company.city, company.state, company.country),
                    ...(company.branches || []).map((branch) => branch.address),
                ].filter(Boolean))),
                website: company.website_url || undefined,
                socialLinks: {
                    linkedin: company.linkedin_page_url || null,
                    facebook: company.facebook_page_url || null,
                    instagram: company.instagram_page_url || null,
                    twitter: company.twitter_page_url || null,
                    youtube: company.youtube_channel_url || null,
                },
            },
            viewerState: {
                following,
                isSelf: false,
                canManage,
            },
        };
    }
    async searchUsers(q, page, limit, viewerId) {
        const patterns = this.getSearchPatterns(q);
        const displayName = `COALESCE(
      NULLIF(TRIM(user.full_name), ''),
      TRIM(CONCAT_WS(' ', user.firstName, user.lastName))
    )`;
        const rank = `CASE
      WHEN LOWER(${displayName}) = :exactQuery
        OR LOWER(COALESCE(user.firstName, '')) = :exactQuery
        OR LOWER(COALESCE(user.lastName, '')) = :exactQuery THEN 0
      WHEN LOWER(${displayName}) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(COALESCE(user.firstName, '')) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(COALESCE(user.lastName, '')) LIKE :prefixQuery ESCAPE '!' THEN 1
      ELSE 2
    END`;
        const qb = this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.country', 'country')
            .leftJoinAndSelect('user.work_experience', 'workExperience')
            .where('user.isBanned = :isBanned', { isBanned: false })
            .andWhere('user.deletedAt IS NULL')
            .andWhere(`(LOWER(COALESCE(user.full_name, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(user.firstName, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(user.lastName, '')) LIKE :containsQuery ESCAPE '!')`, patterns)
            .addSelect(rank, 'searchRank')
            .addSelect(`LOWER(${displayName})`, 'searchDisplayName')
            .orderBy('searchRank', 'ASC')
            .addOrderBy('searchDisplayName', 'ASC')
            .addOrderBy('user.id', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);
        const blocked = await this.moderationService.blockedTargets(viewerId);
        if (blocked.userIds.length) {
            qb.andWhere('user.id NOT IN (:...blockedUserIds)', {
                blockedUserIds: blocked.userIds,
            });
        }
        const [users, total] = await qb.getManyAndCount();
        return this.getSearchResponse(await Promise.all(users.map((user) => this.formatUserSearchResult(user))), total, page, limit);
    }
    async searchCompanies(q, page, limit, viewerId) {
        const patterns = this.getSearchPatterns(q);
        const rank = `CASE
      WHEN LOWER(page.company_name) = :exactQuery
        OR LOWER(page.username) = :exactQuery THEN 0
      WHEN LOWER(page.company_name) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(page.username) LIKE :prefixQuery ESCAPE '!' THEN 1
      ELSE 2
    END`;
        const qb = this.pageRepo
            .createQueryBuilder('page')
            .where('page.verificationStatus = :verificationStatus', {
            verificationStatus: 'approved',
        })
            .andWhere(`(LOWER(COALESCE(page.company_name, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(page.username, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(page.industry_type, '')) LIKE :containsQuery ESCAPE '!')`, patterns)
            .addSelect(rank, 'searchRank')
            .orderBy('searchRank', 'ASC')
            .addOrderBy('LOWER(page.company_name)', 'ASC')
            .addOrderBy('page.id', 'ASC')
            .skip((page - 1) * limit)
            .take(limit);
        const blocked = await this.moderationService.blockedTargets(viewerId);
        if (blocked.companyIds.length) {
            qb.andWhere('page.id NOT IN (:...blockedCompanyIds)', {
                blockedCompanyIds: blocked.companyIds,
            });
        }
        const [companies, total] = await qb.getManyAndCount();
        return this.getSearchResponse(await Promise.all(companies.map((company) => this.formatCompanySearchResult(company))), total, page, limit);
    }
    async formatUserSearchResult(user) {
        const publisher = (0, profile_format_util_1.formatUserPublisher)(user);
        const subtitle = user.work_experience?.find((item) => item.currently_working && item.designation)?.designation;
        const location = this.formatLocation(user.city, user.state, user.country?.name);
        return {
            type: publisher.type,
            id: publisher.id,
            name: publisher.name,
            handle: publisher.handle,
            avatarUri: await this.userAvatarUrl(user),
            verified: publisher.verified,
            ...(subtitle ? { subtitle } : {}),
            ...(location ? { location } : {}),
        };
    }
    async formatCompanySearchResult(company) {
        const publisher = (0, profile_format_util_1.formatCompanyPublisher)(company);
        const subtitle = company.industry_type || undefined;
        const location = this.formatLocation(company.city, company.state, company.country);
        return {
            type: publisher.type,
            id: publisher.id,
            name: publisher.name,
            handle: publisher.handle,
            avatarUri: publisher.avatarUri,
            ...(company.logoAssetId
                ? { avatarUri: await this.storageService.getUrl(company.logoAssetId) }
                : {}),
            verified: publisher.verified,
            ...(subtitle ? { subtitle } : {}),
            ...(location ? { location } : {}),
        };
    }
    getSearchPatterns(q) {
        const escaped = q
            .replace(/!/g, '!!')
            .replace(/%/g, '!%')
            .replace(/_/g, '!_');
        return {
            exactQuery: q,
            prefixQuery: `${escaped}%`,
            containsQuery: `%${escaped}%`,
        };
    }
    getSearchResponse(data, total, page, limit) {
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async assertTargetViewable(type, id) {
        if (type === 'user') {
            const user = await this.userRepo.findOne({ where: { id } });
            if (!user || user.isBanned)
                throw new common_1.NotFoundException('Profile not found');
            return;
        }
        const company = await this.pageRepo.findOne({ where: { id } });
        if (!company || company.verificationStatus !== 'approved') {
            throw new common_1.NotFoundException('Profile not found');
        }
    }
    isFollowing(followerUserId, profileType, profileId) {
        return this.followRepo
            .findOne({ where: { followerUserId, profileType, profileId } })
            .then(Boolean);
    }
    parseProfileType(value) {
        if (value !== 'user' && value !== 'company') {
            throw new common_1.BadRequestException('profileType must be user or company');
        }
        return value;
    }
    followResponse(profileType, profileId, following) {
        return { profileType, profileId: String(profileId), following };
    }
    formatLocation(...parts) {
        return parts.filter(Boolean).join(', ') || undefined;
    }
    async userAvatarUrl(user) {
        return user.profilePhotoAssetId
            ? await this.storageService.getUrl(user.profilePhotoAssetId)
            : user.profile_photo || null;
    }
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(profile_follow_entity_1.ProfileFollow)),
    __param(1, (0, typeorm_1.InjectRepository)(reel_creator_follow_entity_1.ReelCreatorFollow)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        moderation_service_1.ModerationService,
        object_storage_service_1.ObjectStorageService])
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map