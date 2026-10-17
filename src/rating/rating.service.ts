import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating, RatingDirection } from './entities/rating.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { isJobEmployer } from 'src/job/job-employer.util';

const EMPLOYEE_TO_EMPLOYER: RatingDirection = 'employee_to_employer';
const EMPLOYER_TO_EMPLOYEE: RatingDirection = 'employer_to_employee';

/**
 * Two rating scores exist:
 *
 * 1. USER profile (`users.ratingAverage` / `ratingCount`): the average of ALL
 *    ratings the person received, in either role - as an employee (rated by
 *    employers) and as an employer (rated by employees of jobs they posted
 *    themselves). One person can be both, so both roles feed one score.
 *
 * 2. COMPANY page (`pages.company_rating` / `company_rating_count`): the
 *    average of the ratings employees gave the employer of a job that was
 *    posted UNDER that page. Those ratings go to the company, not to the
 *    individual who posted the job.
 */
@Injectable()
export class RatingService implements OnModuleInit {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,

    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(CompanyPage)
    private readonly pageRepo: Repository<CompanyPage>,
  ) {}

  /** Ratings made before `direction` existed: derive it from who rated */
  async onModuleInit() {
    try {
      await this.ratingRepo.query(
        `UPDATE ratings r
         JOIN job_applications a ON a.id = r.jobApplicationId
         SET r.direction = IF(r.givenBy = a.applicantId, '${EMPLOYEE_TO_EMPLOYER}', '${EMPLOYER_TO_EMPLOYEE}')
         WHERE r.direction IS NULL`,
      );
    } catch (err) {
      console.warn(
        '[RatingService] direction backfill skipped:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // ────────────────────────────────────────────────
  // GIVE A RATING
  // ────────────────────────────────────────────────

  /**
   * Allowed only on an ACCEPTED application, once per side:
   * - the applicant (employee) rates the employer side
   * - the employer side (poster / company owner, admin, editor) rates the applicant
   */
  async rateUser(
    raterId: number,
    jobApplicationId: number,
    stars: number,
    comment: string,
  ) {
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('Stars must be between 1 and 5');
    }

    const app = await this.appRepo.findOne({
      where: { id: jobApplicationId },
      relations: ['job'],
    });

    if (!app) throw new NotFoundException('Job application not found');
    if (app.status !== 'accepted')
      throw new BadRequestException('Rating allowed only after acceptance');

    const direction = await this.directionFor(raterId, app);
    if (!direction) {
      throw new BadRequestException('You cannot rate this application');
    }

    const already = await this.ratingRepo.findOne({
      where: { jobApplicationId, direction },
    });
    if (already) {
      throw new BadRequestException(
        direction === EMPLOYEE_TO_EMPLOYER
          ? 'You already rated this job'
          : 'The employer side already rated this applicant',
      );
    }

    // who/what receives the rating
    let givenTo: number | null;
    let pageId: number | null = null;
    if (direction === EMPLOYER_TO_EMPLOYEE) {
      givenTo = app.applicantId;
    } else if (app.job.pageId) {
      givenTo = null; // company page job: the COMPANY is rated
      pageId = app.job.pageId;
    } else {
      givenTo = app.job.createdBy; // personal job: the poster is rated
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
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('This application was already rated');
      }
      throw err;
    }

    if (pageId) await this.updatePageRatingStats(pageId);
    else await this.updateUserRatingStats(givenTo);

    return {
      message: 'Rating submitted',
      rating,
      ratedEntity: pageId
        ? { type: 'company', pageId }
        : { type: 'user', userId: givenTo },
    };
  }

  /** employee_to_employer / employer_to_employee / null (not part of this application) */
  private async directionFor(
    userId: number,
    app: JobApplication,
  ): Promise<RatingDirection | null> {
    if (userId === app.applicantId) return EMPLOYEE_TO_EMPLOYER;
    if (await isJobEmployer(this.pageRepo, app.job, userId)) {
      return EMPLOYER_TO_EMPLOYEE;
    }
    return null;
  }

  // ────────────────────────────────────────────────
  // STATS
  // ────────────────────────────────────────────────

  /** User score = average of every rating received (employee + employer roles) */
  async updateUserRatingStats(userId: number) {
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

  /** Company score = average of employees' ratings for jobs posted under the page */
  async updatePageRatingStats(pageId: number) {
    const row = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.stars)', 'avg')
      .addSelect('COUNT(*)', 'total')
      .where('r.pageId = :pageId', { pageId })
      .getRawOne();

    await this.pageRepo.update(pageId, {
      company_rating: row?.avg != null ? Number(row.avg) : null,
      company_rating_count: Number(row?.total ?? 0),
    });
  }

  // ────────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────────

  async getUserSummary(userId: number, limit = 10) {
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
    if (!user) throw new NotFoundException('User not found');

    const breakdown: { direction: string; avg: string; total: string }[] =
      await this.ratingRepo
        .createQueryBuilder('r')
        .select('r.direction', 'direction')
        .addSelect('AVG(r.stars)', 'avg')
        .addSelect('COUNT(*)', 'total')
        .where('r.givenTo = :userId', { userId })
        .groupBy('r.direction')
        .getRawMany();

    const part = (direction: RatingDirection) => {
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
      // same pool, split by the role the person had when rated
      asEmployee: part(EMPLOYER_TO_EMPLOYEE),
      asEmployer: part(EMPLOYEE_TO_EMPLOYER),
      recent: await this.recent('r.givenTo = :id', userId, limit),
    };
  }

  async getCompanySummary(pageId: number, limit = 10) {
    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      select: [
        'id',
        'company_name',
        'username',
        'company_logo',
        'company_rating',
        'company_rating_count',
      ],
    });
    if (!page) throw new NotFoundException('Company page not found');

    return {
      company: {
        id: page.id,
        name: page.company_name,
        username: page.username,
        logo: page.company_logo,
      },
      average: page.company_rating ?? 0,
      count: page.company_rating_count ?? 0,
      recent: await this.recent('r.pageId = :id', pageId, limit),
    };
  }

  /** What the rating screen needs for ONE application */
  async getApplicationRatingState(applicationId: number, userId: number) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });
    if (!app) throw new NotFoundException('Job application not found');

    const direction = await this.directionFor(userId, app);
    if (!direction) {
      throw new ForbiddenException('You are not part of this application');
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
      // you rate the other side: the company for page jobs, otherwise the person
      willRate:
        direction === EMPLOYER_TO_EMPLOYEE
          ? { type: 'user', userId: app.applicantId }
          : app.job.pageId
            ? { type: 'company', pageId: app.job.pageId }
            : { type: 'user', userId: app.job.createdBy },
      canRate: app.status === 'accepted' && !iRated,
      iRated,
      otherSideRated,
      reason:
        app.status !== 'accepted'
          ? 'Ratings open after the application is accepted'
          : iRated
            ? 'You already rated'
            : '',
    };
  }

  private async recent(where: string, id: number, limit: number) {
    const rows = await this.ratingRepo
      .createQueryBuilder('r')
      .leftJoin(JobApplication, 'a', 'a.id = r.jobApplicationId')
      .leftJoin(Job, 'j', 'j.id = a.jobId')
      .leftJoin(User, 'u', 'u.id = r.givenBy')
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
      // the role the rated user had: employee (rated by employer) or employer
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
}
