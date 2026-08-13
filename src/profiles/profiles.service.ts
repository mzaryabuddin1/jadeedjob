import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { normalizeCompanyPermissions } from 'src/pages/company-permissions';
import { ProfileFollow, ProfileType } from './entities/profile-follow.entity';
import {
  formatCompanyPublisher,
  formatUserPublisher,
} from './profile-format.util';
import { ModerationService } from 'src/moderation/moderation.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { NotificationsService } from 'src/notifications/notifications.service';

type ProfileSearchQuery = {
  profileType: ProfileType;
  q: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(ProfileFollow)
    private readonly followRepo: Repository<ProfileFollow>,
    @InjectRepository(ReelCreatorFollow)
    private readonly legacyFollowRepo: Repository<ReelCreatorFollow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyPage)
    private readonly pageRepo: Repository<CompanyPage>,
    private readonly moderationService: ModerationService,
    private readonly storageService: ObjectStorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async searchProfiles(query: ProfileSearchQuery, viewerId: number) {
    const profileType = this.parseProfileType(query.profileType);
    const q = query.q.trim().toLowerCase();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 20));

    if (profileType === 'user') {
      return this.searchUsers(q, page, limit, viewerId);
    }

    return this.searchCompanies(q, page, limit, viewerId);
  }

  async getProfile(profileType: string, profileId: number, viewerId: number) {
    const type = this.parseProfileType(profileType);
    await this.moderationService.assertInteractionAllowed(
      viewerId,
      type,
      profileId,
    );
    if (type === 'user') {
      return this.getUserProfile(profileId, viewerId);
    }

    return this.getCompanyProfile(profileId, viewerId);
  }

  async follow(profileType: string, profileId: number, followerUserId: number) {
    const type = this.parseProfileType(profileType);
    await this.assertTargetViewable(type, profileId);
    await this.moderationService.assertInteractionAllowed(
      followerUserId,
      type,
      profileId,
    );

    if (type === 'user' && profileId === followerUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const inserted = await this.followRepo.manager.transaction(async (manager) => {
      const result = await manager
        .getRepository(ProfileFollow)
        .createQueryBuilder()
        .insert()
        .into(ProfileFollow)
        .values({ followerUserId, profileType: type, profileId })
        .orIgnore()
        .execute();

      if (type === 'user') {
        await manager
          .getRepository(ReelCreatorFollow)
          .createQueryBuilder()
          .insert()
          .into(ReelCreatorFollow)
          .values({ creatorId: profileId, followerId: followerUserId })
          .orIgnore()
          .execute();
      }
      return this.wasInserted(result);
    });

    if (inserted) {
      const recipientId =
        type === 'user'
          ? profileId
          : (await this.pageRepo.findOne({
              where: { id: profileId },
              select: ['id', 'ownerId'],
            }))?.ownerId;
      if (recipientId && recipientId !== followerUserId) {
        await this.notificationsService.create({
          userId: recipientId,
          type: 'profile_follow',
          title: 'New follower',
          message: 'Someone started following your profile.',
          data: {
            profileType: type,
            profileId: String(profileId),
            followerId: String(followerUserId),
          },
          dedupeKey: `profile_follow:${followerUserId}:${type}:${profileId}`,
        });
      }
    }

    return this.followResponse(type, profileId, true);
  }

  async unfollow(
    profileType: string,
    profileId: number,
    followerUserId: number,
  ) {
    const type = this.parseProfileType(profileType);

    await this.followRepo.manager.transaction(async (manager) => {
      await manager.getRepository(ProfileFollow).delete({
        followerUserId,
        profileType: type,
        profileId,
      });

      if (type === 'user') {
        await manager.getRepository(ReelCreatorFollow).delete({
          creatorId: profileId,
          followerId: followerUserId,
        });
      }
    });

    return this.followResponse(type, profileId, false);
  }

  private async getUserProfile(userId: number, viewerId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.isBanned)
      throw new NotFoundException('Profile not found');

    const [followersCount, following] = await Promise.all([
      this.followRepo.count({
        where: { profileType: 'user', profileId: userId },
      }),
      this.isFollowing(viewerId, 'user', userId),
    ]);
    const publisher = formatUserPublisher(user);
    const skills = Array.from(
      new Set([
        ...(user.skills || []),
        ...(user.technical_skills || []),
        ...(user.soft_skills || []),
      ]),
    );

    return {
      profile: {
        ...publisher,
        avatarUri: await this.userAvatarUrl(user),
        subtitle: user.work_experience?.find((item) => item.currently_working)
          ?.designation,
        location: this.formatLocation(
          user.city,
          user.state,
          user.country?.name,
        ),
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

  private wasInserted(result: { raw?: any; identifiers?: any[] }) {
    if (typeof result.raw?.affectedRows === 'number') {
      return result.raw.affectedRows > 0;
    }
    return Boolean(result.identifiers?.length);
  }

  private async getCompanyProfile(companyId: number, viewerId: number) {
    const company = await this.pageRepo.findOne({
      where: { id: companyId },
      relations: ['members', 'branches'],
    });
    if (!company || company.verificationStatus !== 'approved') {
      throw new NotFoundException('Profile not found');
    }

    const member =
      company.ownerId === viewerId
        ? ({ role: 'owner', hasAccess: true, permissions: null } as const)
        : company.members?.find((item) => item.userId === viewerId);
    const canManage = Boolean(
      member &&
        member.hasAccess !== false &&
        normalizeCompanyPermissions(member.role, member.permissions).manageTeam,
    );
    const [followersCount, following] = await Promise.all([
      this.followRepo.count({
        where: { profileType: 'company', profileId: companyId },
      }),
      this.isFollowing(viewerId, 'company', companyId),
    ]);

    return {
      profile: {
        ...formatCompanyPublisher(company),
        avatarUri: company.logoAssetId
          ? await this.storageService.getUrl(company.logoAssetId)
          : company.company_logo || null,
        subtitle: company.industry_type || undefined,
        location: this.formatLocation(
          company.city,
          company.state,
          company.country,
        ),
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
        locations: Array.from(
          new Set(
            [
              this.formatLocation(company.city, company.state, company.country),
              ...(company.branches || []).map((branch) => branch.address),
            ].filter(Boolean),
          ),
        ),
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

  private async searchUsers(
    q: string,
    page: number,
    limit: number,
    viewerId: number,
  ) {
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
      .andWhere(
        `(LOWER(COALESCE(user.full_name, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(user.firstName, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(user.lastName, '')) LIKE :containsQuery ESCAPE '!')`,
        patterns,
      )
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

    return this.getSearchResponse(
      await Promise.all(
        users.map((user) => this.formatUserSearchResult(user)),
      ),
      total,
      page,
      limit,
    );
  }

  private async searchCompanies(
    q: string,
    page: number,
    limit: number,
    viewerId: number,
  ) {
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
      .andWhere(
        `(LOWER(COALESCE(page.company_name, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(page.username, '')) LIKE :containsQuery ESCAPE '!'
          OR LOWER(COALESCE(page.industry_type, '')) LIKE :containsQuery ESCAPE '!')`,
        patterns,
      )
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

    return this.getSearchResponse(
      await Promise.all(
        companies.map((company) =>
          this.formatCompanySearchResult(company),
        ),
      ),
      total,
      page,
      limit,
    );
  }

  private async formatUserSearchResult(user: User) {
    const publisher = formatUserPublisher(user);
    const subtitle = user.work_experience?.find(
      (item) => item.currently_working && item.designation,
    )?.designation;
    const location = this.formatLocation(
      user.city,
      user.state,
      user.country?.name,
    );

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

  private async formatCompanySearchResult(company: CompanyPage) {
    const publisher = formatCompanyPublisher(company);
    const subtitle = company.industry_type || undefined;
    const location = this.formatLocation(
      company.city,
      company.state,
      company.country,
    );

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

  private getSearchPatterns(q: string) {
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

  private getSearchResponse(
    data: Array<Record<string, any>>,
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  private async assertTargetViewable(type: ProfileType, id: number) {
    if (type === 'user') {
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user || user.isBanned)
        throw new NotFoundException('Profile not found');
      return;
    }

    const company = await this.pageRepo.findOne({ where: { id } });
    if (!company || company.verificationStatus !== 'approved') {
      throw new NotFoundException('Profile not found');
    }
  }

  private isFollowing(
    followerUserId: number,
    profileType: ProfileType,
    profileId: number,
  ) {
    return this.followRepo
      .findOne({ where: { followerUserId, profileType, profileId } })
      .then(Boolean);
  }

  private parseProfileType(value: string): ProfileType {
    if (value !== 'user' && value !== 'company') {
      throw new BadRequestException('profileType must be user or company');
    }
    return value;
  }

  private followResponse(
    profileType: ProfileType,
    profileId: number,
    following: boolean,
  ) {
    return { profileType, profileId: String(profileId), following };
  }

  private formatLocation(...parts: Array<string | null | undefined>) {
    return parts.filter(Boolean).join(', ') || undefined;
  }

  private async userAvatarUrl(user: User) {
    return user.profilePhotoAssetId
      ? await this.storageService.getUrl(user.profilePhotoAssetId)
      : user.profile_photo || null;
  }
}
