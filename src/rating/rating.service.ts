import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { normalizeCompanyPermissions } from 'src/pages/company-permissions';
import { User } from 'src/users/entities/user.entity';
import { Rating } from './entities/rating.entity';

type RatingContext = {
  side: 'worker' | 'employer';
  targetType: 'user' | 'company';
  targetUserId: number | null;
  targetCompanyId: number | null;
};

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CompanyPage)
    private readonly companyRepo: Repository<CompanyPage>,
    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,
  ) {}

  async rateUser(
    raterId: number,
    jobApplicationId: number,
    stars: number,
    comment: string,
  ) {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new BadRequestException('Stars must be between 1 and 5');
    }
    return this.ratingRepo.manager.transaction(async (manager) => {
      const app = await this.loadApplication(
        jobApplicationId,
        manager,
        true,
      );
      if (app.status !== 'completed') {
        throw new BadRequestException('Rating is allowed only after completed work');
      }
      const context = await this.resolveRatingContext(app, raterId, manager);
      const existing = await manager.getRepository(Rating).findOne({
        where: { jobApplicationId, side: context.side },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        throw new BadRequestException('This side has already submitted a rating');
      }

      const rating = await manager.getRepository(Rating).save(
        manager.getRepository(Rating).create({
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
        }),
      );
      await this.updateAggregate(context, manager);
      return {
        message: 'Rating submitted',
        rating: this.formatRating(rating),
      };
    });
  }

  async getMine(applicationId: number, userId: number) {
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

  private async loadApplication(
    id: number,
    manager: EntityManager = this.appRepo.manager,
    lock = false,
  ) {
    const app = await manager.getRepository(JobApplication).findOne({
      where: { id },
      relations: ['job', 'job.page', 'job.creator', 'applicant'],
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!app) throw new NotFoundException('Job application not found');
    return app;
  }

  private async resolveRatingContext(
    app: JobApplication,
    userId: number,
    manager: EntityManager = this.appRepo.manager,
  ): Promise<RatingContext> {
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
      throw new ForbiddenException('You cannot rate this application');
    }
    return {
      side: 'worker',
      targetType: 'user',
      targetUserId: app.applicantId,
      targetCompanyId: null,
    };
  }

  private async canRateAsEmployer(
    app: JobApplication,
    userId: number,
    manager: EntityManager,
  ) {
    if (!app.job.pageId) return app.job.createdBy === userId;
    const company =
      app.job.page ||
      (await manager
        .getRepository(CompanyPage)
        .findOne({ where: { id: app.job.pageId } }));
    if (!company || company.verificationStatus !== 'approved') return false;
    if (company.ownerId === userId) return true;
    const member = await manager.getRepository(PageMember).findOne({
      where: { pageId: company.id, userId, hasAccess: true },
    });
    return Boolean(
      member &&
        normalizeCompanyPermissions(
          member.role,
          member.permissions,
        ).viewApplicants,
    );
  }

  private async updateAggregate(
    context: RatingContext,
    manager: EntityManager,
  ) {
    const ratings = await manager.getRepository(Rating).find({
      where:
        context.targetType === 'company'
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
      await manager.getRepository(CompanyPage).update(
        context.targetCompanyId,
        { ratingAverage: average, ratingCount: count },
      );
    } else {
      await manager.getRepository(User).update(context.targetUserId, {
        ratingAverage: average,
        ratingCount: count,
      });
    }
  }

  private formatRating(rating: Rating) {
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
}
