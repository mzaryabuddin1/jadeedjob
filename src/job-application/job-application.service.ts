import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';

type ReceivedApplicationsQuery = {
  status?: 'pending' | 'accepted' | 'rejected' | 'all';
  page?: number;
  limit?: number;
};

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectRepository(JobApplication)
    private jobAppRepo: Repository<JobApplication>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Rating)
    private ratingRepo: Repository<Rating>,
  ) {}

  private formatDemand(job: Job) {
    const currency = job.currency || '₨';
    const amount =
      typeof job.salaryAmount === 'number'
        ? job.salaryAmount.toLocaleString()
        : '0';

    if (job.salaryType === 'daily-wage') return `${currency} ${amount} / day`;
    if (job.salaryType === 'monthly') return `${currency} ${amount} / month`;

    return `${currency} ${amount}`;
  }

  private getApplicantName(applicant?: User | null) {
    if (!applicant) return '';

    const fullName = (applicant.full_name || '').trim();
    if (fullName) return fullName;

    return [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
  }

  private getJobSummary(job: Job) {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      salaryType: job.salaryType,
      salaryAmount: job.salaryAmount,
      currency: job.currency,
      filter: job.filter ?? null,
    };
  }

  async apply(data: { jobId: number; applicantId: number }) {
    const job = await this.jobRepo.findOne({
      where: { id: data.jobId, isActive: true },
    });

    if (!job) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    const existing = await this.jobAppRepo.findOne({
      where: {
        jobId: data.jobId,
        applicantId: data.applicantId,
      },
    });

    if (existing) {
      throw new BadRequestException('You already applied to this job');
    }

    const app = this.jobAppRepo.create({
      jobId: data.jobId,
      applicantId: data.applicantId,
    });

    return this.jobAppRepo.save(app);
  }

  async getApplicationsByUser(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await this.jobAppRepo.findAndCount({
      where: { applicantId: userId },
      relations: ['job'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: applications,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getApplicationsByJob(jobId: number) {
    return this.jobAppRepo.find({
      where: { jobId },
      relations: ['applicant'],
    });
  }

  async getReceivedApplicationsForJob(
    jobId: number,
    employerId: number,
    query: ReceivedApplicationsQuery = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const status = query.status || 'all';

    const job = await this.jobRepo.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.createdBy !== employerId) {
      throw new ForbiddenException('You cannot view applications for this job');
    }

    const baseWhere = { jobId };
    const where =
      status === 'all'
        ? baseWhere
        : {
            ...baseWhere,
            status,
          };

    const [applications, total] = await this.jobAppRepo.findAndCount({
      where,
      relations: ['applicant'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const [pending, accepted, rejected] = await Promise.all([
      this.jobAppRepo.count({ where: { jobId, status: 'pending' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'accepted' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'rejected' } }),
    ]);

    const applicationIds = applications.map((application) => application.id);
    const reviews = applicationIds.length
      ? await this.ratingRepo.find({
          where: {
            jobApplicationId: In(applicationIds),
            givenBy: employerId,
          },
        })
      : [];
    const reviewsByApplicationId = new Map(
      reviews.map((review) => [review.jobApplicationId, review]),
    );

    const demand = this.formatDemand(job);

    return {
      data: applications.map((application) => {
        const applicant = application.applicant;
        const review = reviewsByApplicationId.get(application.id);
        const ratingAverage = Number(applicant?.ratingAverage || 0);
        const ratingCount = Number(applicant?.ratingCount || 0);

        return {
          id: application.id,
          jobApplicationId: application.id,
          jobId: application.jobId,
          applicantId: application.applicantId,
          name: this.getApplicantName(applicant),
          avatarUrl: applicant?.profile_photo ?? null,
          demand,
          rating: ratingAverage,
          ratingCount,
          status: application.status,
          lastReview: review
            ? {
                stars: review.stars,
                comment: review.comment || '',
              }
            : null,
          applicant: {
            id: applicant?.id,
            firstName: applicant?.firstName ?? '',
            lastName: applicant?.lastName ?? '',
            full_name: applicant?.full_name ?? null,
            profile_photo: applicant?.profile_photo ?? null,
            city: applicant?.city ?? null,
            ratingAverage,
            ratingCount,
          },
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        };
      }),
      counts: {
        pending,
        accepted,
        rejected,
        all: pending + accepted + rejected,
      },
      job: this.getJobSummary(job),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async updateStatus(id: number, status: string, employerId: number) {
    const app = await this.jobAppRepo.findOne({
      where: { id },
      relations: ['job'],
    });

    if (!app) {
      throw new BadRequestException('Application not found');
    }

    if (app.job.createdBy !== employerId) {
      throw new ForbiddenException('You cannot update this application');
    }

    app.status = status;
    return this.jobAppRepo.save(app);
  }
}
