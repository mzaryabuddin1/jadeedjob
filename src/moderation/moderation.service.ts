import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import {
  ProfileFollow,
  ProfileType,
} from 'src/profiles/entities/profile-follow.entity';
import {
  formatCompanyPublisher,
  formatUserPublisher,
} from 'src/profiles/profile-format.util';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ReelReport } from 'src/reels/entities/reel-report.entity';
import { Reel } from 'src/reels/entities/reel.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ProfileBlock)
    private readonly blockRepo: Repository<ProfileBlock>,
    @InjectRepository(ProfileFollow)
    private readonly followRepo: Repository<ProfileFollow>,
    @InjectRepository(ReelCreatorFollow)
    private readonly legacyFollowRepo: Repository<ReelCreatorFollow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyPage)
    private readonly companyRepo: Repository<CompanyPage>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
    @InjectRepository(ReelReport)
    private readonly reportRepo: Repository<ReelReport>,
  ) {}

  parseProfileType(value: string): ProfileType {
    if (value !== 'user' && value !== 'company') {
      throw new BadRequestException('Invalid profile type');
    }
    return value;
  }

  async block(
    blockerUserId: number,
    profileTypeValue: string,
    profileId: number,
  ) {
    const profileType = this.parseProfileType(profileTypeValue);
    await this.assertTargetExists(profileType, profileId);
    if (profileType === 'user' && blockerUserId === profileId) {
      throw new BadRequestException('You cannot block yourself');
    }

    await this.blockRepo.manager.transaction(async (manager) => {
      await manager
        .getRepository(ProfileBlock)
        .createQueryBuilder()
        .insert()
        .values({ blockerUserId, profileType, profileId })
        .orIgnore()
        .execute();

      const follows = manager.getRepository(ProfileFollow);
      await follows.delete({ followerUserId: blockerUserId, profileType, profileId });
      if (profileType === 'user') {
        await follows.delete({
          followerUserId: profileId,
          profileType: 'user',
          profileId: blockerUserId,
        });
        const legacy = manager.getRepository(ReelCreatorFollow);
        await legacy.delete([
          { followerId: blockerUserId, creatorId: profileId },
          { followerId: profileId, creatorId: blockerUserId },
        ]);
      }
    });

    return { profileType, profileId: String(profileId), blocked: true };
  }

  async unblock(
    blockerUserId: number,
    profileTypeValue: string,
    profileId: number,
  ) {
    const profileType = this.parseProfileType(profileTypeValue);
    await this.blockRepo.delete({ blockerUserId, profileType, profileId });
    return { profileType, profileId: String(profileId), blocked: false };
  }

  async listBlocked(userId: number, page = 1, limit = 20) {
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
      userIds.length ? this.userRepo.findBy({ id: In(userIds) }) : [],
      companyIds.length ? this.companyRepo.findBy({ id: In(companyIds) }) : [],
    ]);
    const userMap = new Map<number, User>(
      users.map((item): [number, User] => [item.id, item]),
    );
    const companyMap = new Map<number, CompanyPage>(
      companies.map((item): [number, CompanyPage] => [item.id, item]),
    );

    return {
      data: blocks
        .map((item) => {
          const target =
            item.profileType === 'user'
              ? userMap.get(item.profileId)
              : companyMap.get(item.profileId);
          if (!target) return null;
          return {
            ...(item.profileType === 'user'
              ? formatUserPublisher(target as User)
              : formatCompanyPublisher(target as CompanyPage)),
            blockedAt: item.createdAt,
          };
        })
        .filter(Boolean),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async isInteractionBlocked(
    viewerId: number,
    targetType: ProfileType,
    targetId: number,
  ) {
    const direct = await this.blockRepo.findOne({
      where: {
        blockerUserId: viewerId,
        profileType: targetType,
        profileId: targetId,
      },
    });
    if (direct) return true;
    if (targetType !== 'user') return false;
    return Boolean(
      await this.blockRepo.findOne({
        where: {
          blockerUserId: targetId,
          profileType: 'user',
          profileId: viewerId,
        },
      }),
    );
  }

  async assertInteractionAllowed(
    viewerId: number,
    targetType: ProfileType,
    targetId: number,
  ) {
    if (await this.isInteractionBlocked(viewerId, targetType, targetId)) {
      throw new ForbiddenException({
        code: 'PROFILE_BLOCKED',
        message: 'This action is unavailable because of a blocked relationship',
      });
    }
  }

  async blockedTargets(userId: number) {
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
        ...new Set(
          own
            .filter((item) => item.profileType === 'company')
            .map((item) => item.profileId),
        ),
      ],
    };
  }

  async reportReel(
    reelId: number,
    reporterUserId: number,
    body: { reason: ReelReport['reason']; details?: string },
  ) {
    const reel = await this.reelRepo.findOne({ where: { id: reelId } });
    if (!reel || reel.deletedAt || reel.status === 'deleted') {
      throw new NotFoundException('Reel not found');
    }
    if (
      await this.reportRepo.findOne({
        where: { reelId, reporterUserId },
      })
    ) {
      throw new ConflictException('Reel already reported');
    }
    const report = await this.reportRepo.save(
      this.reportRepo.create({
        reelId,
        reporterUserId,
        reason: body.reason,
        details: body.details || null,
      }),
    );
    return { reportId: report.id, status: report.status };
  }

  async listReelReports(status = 'pending', page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const [data, total] = await this.reportRepo.findAndCount({
      where: status === 'all' ? {} : ({ status } as any),
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

  async resolveReelReport(
    reportId: number,
    adminId: number,
    status: ReelReport['status'],
    resolutionNote?: string,
  ) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Reel report not found');
    report.status = status;
    report.resolvedByAdminId = adminId;
    report.resolutionNote = resolutionNote || null;
    report.resolvedAt = new Date();
    return this.reportRepo.save(report);
  }

  private async assertTargetExists(type: ProfileType, id: number) {
    const target =
      type === 'user'
        ? await this.userRepo.findOne({ where: { id } })
        : await this.companyRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Profile not found');
  }
}
