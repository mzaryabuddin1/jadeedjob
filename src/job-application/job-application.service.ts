import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

type ReceivedApplicationsQuery = {
  status?: ApplicationStatus | 'all';
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

    @InjectRepository(PageMember)
    private pageMemberRepo: Repository<PageMember>,

    private notificationsService: NotificationsService,
  ) {}

  private formatDemand(job: Job) {
    const currency = job.currency || '₨';
    const amount =
      typeof job.salaryAmount === 'number'
        ? job.salaryAmount.toLocaleString()
        : '0';

    if (job.salaryType === 'daily-wage') return `${currency} ${amount} / day`;
    if (job.salaryType === 'hourly') return `${currency} ${amount} / hour`;
    if (job.salaryType === 'monthly') return `${currency} ${amount} / month`;

    return `${currency} ${amount}`;
  }

  private getApplicantName(applicant?: User | null) {
    if (!applicant) return '';

    const fullName = (applicant.full_name || '').trim();
    if (fullName) return fullName;

    return [applicant.firstName, applicant.lastName].filter(Boolean).join(' ');
  }

  private getEmployerName(job: Job) {
    return (
      job.page?.company_name ||
      job.creator?.full_name ||
      [job.creator?.firstName, job.creator?.lastName].filter(Boolean).join(' ') ||
      'Individual'
    );
  }

  private getJobSummary(job: Job) {
    const employerName = this.getEmployerName(job);

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      salaryType: job.salaryType,
      salaryAmount: job.salaryAmount,
      currency: job.currency,
      filter: job.filter ?? null,
      companyName: employerName,
      employerName,
      employerType: job.pageId ? 'company' : 'individual',
      status: job.status || (job.isActive ? 'active' : 'closed'),
      payType: job.salaryType,
    };
  }

  private getEmployerSummary(job: Job) {
    const name = this.getEmployerName(job);

    return {
      id: job.pageId || job.createdBy,
      type: job.pageId ? 'company' : 'individual',
      companyId: job.pageId || null,
      name,
      companyName: name,
      logoUrl: job.page?.company_logo || job.creator?.profile_photo || null,
    };
  }

  private async canManageJob(job: Job, userId: number) {
    if (job.createdBy === userId) return true;
    if (!job.pageId) return false;

    const member = await this.pageMemberRepo.findOne({
      where: { pageId: job.pageId, userId },
    });
    if (!member || member.hasAccess === false) return false;

    const defaultPermissions =
      member.role === 'editor'
        ? {
            viewApplicants: true,
            chatApplicants: true,
          }
        : {
            viewApplicants: true,
            chatApplicants: true,
          };

    const permissions = {
      ...defaultPermissions,
      ...(member.permissions || {}),
    };

    return Boolean(permissions.viewApplicants);
  }

  async apply(data: { jobId: number; applicantId: number }) {
    const job = await this.jobRepo.findOne({
      where: { id: data.jobId, isActive: true },
      relations: ['page', 'creator'],
    });

    if (!job || (job.status && job.status !== 'active')) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    const existing = await this.jobAppRepo.findOne({
      where: {
        jobId: data.jobId,
        applicantId: data.applicantId,
      },
    });

    if (existing && existing.status !== 'withdrawn') {
      throw new BadRequestException('You already applied to this job');
    }

    const app = existing || this.jobAppRepo.create(data);
    app.status = 'pending';
    app.withdrawnAt = null;
    app.completedAt = null;
    const saved = await this.jobAppRepo.save(app);

    await this.notificationsService.create({
      userId: job.createdBy,
      type: 'job_application',
      title: 'New application received',
      message: `Someone applied to ${job.title}.`,
      data: {
        jobId: job.id,
        applicationId: saved.id,
        chatId: saved.id,
        companyId: job.pageId ?? null,
      },
    });

    return saved;
  }

  async getApplicationsByUser(
    userId: number,
    page = 1,
    limit = 10,
    status?: ApplicationStatus | 'all',
  ) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 10));
    const where: any = { applicantId: userId };

    if (status && status !== 'all') {
      where.status = status;
    } else {
      where.status = Not('withdrawn');
    }

    const [applications, total] = await this.jobAppRepo.findAndCount({
      where,
      relations: ['job', 'job.page', 'job.creator', 'job.filter'],
      skip: (currentPage - 1) * take,
      take,
      order: { createdAt: 'DESC' },
    });

    return {
      data: applications.map((application) => ({
        applicationId: application.id,
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        job: this.getJobSummary(application.job),
        employer: this.getEmployerSummary(application.job),
        chatId: application.id,
      })),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async getApplicationHistory(
    userId: number,
    status: ApplicationStatus = 'completed',
    page = 1,
    limit = 20,
  ) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));

    const [applications, total] = await this.jobAppRepo.findAndCount({
      where: { applicantId: userId, status },
      relations: ['job', 'job.page', 'job.creator', 'job.filter'],
      order: { updatedAt: 'DESC' },
      skip: (currentPage - 1) * take,
      take,
    });

    return {
      data: applications.map((application) => ({
        id: application.id,
        applicationId: application.id,
        jobTitle: application.job?.title,
        amount: application.job?.salaryAmount,
        description: application.job?.description,
        completedAt: application.completedAt || application.updatedAt,
        status: application.status,
        employer: this.getEmployerSummary(application.job),
        paymentStatus: 'pending',
      })),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
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
      relations: ['page', 'creator', 'filter'],
    });

    if (!job) throw new NotFoundException('Job not found');
    if (!(await this.canManageJob(job, employerId))) {
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

    const [pending, accepted, rejected, withdrawn, completed] = await Promise.all([
      this.jobAppRepo.count({ where: { jobId, status: 'pending' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'accepted' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'rejected' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'withdrawn' } }),
      this.jobAppRepo.count({ where: { jobId, status: 'completed' } }),
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
          chatId: application.id,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        };
      }),
      counts: {
        pending,
        accepted,
        rejected,
        withdrawn,
        completed,
        all: pending + accepted + rejected + withdrawn + completed,
      },
      job: this.getJobSummary(job),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async updateStatus(id: number, status: ApplicationStatus, employerId: number) {
    const app = await this.jobAppRepo.findOne({
      where: { id },
      relations: ['job', 'job.page', 'job.creator'],
    });

    if (!app) throw new BadRequestException('Application not found');
    if (!(await this.canManageJob(app.job, employerId))) {
      throw new ForbiddenException('You cannot update this application');
    }

    app.status = status;
    if (status === 'completed') app.completedAt = new Date();
    if (status !== 'withdrawn') app.withdrawnAt = null;
    const saved = await this.jobAppRepo.save(app);

    await this.notificationsService.create({
      userId: app.applicantId,
      type: 'application_status',
      title: 'Application status updated',
      message: `Your application for ${app.job.title} is now ${status}.`,
      data: {
        jobId: app.jobId,
        applicationId: app.id,
        chatId: app.id,
        companyId: app.job.pageId ?? null,
      },
    });

    return saved;
  }

  async withdraw(id: number, applicantId: number) {
    const app = await this.jobAppRepo.findOne({
      where: { id },
      relations: ['job'],
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('You cannot withdraw this application');
    }
    if (['accepted', 'completed'].includes(app.status)) {
      throw new BadRequestException('This application cannot be withdrawn');
    }

    app.status = 'withdrawn';
    app.withdrawnAt = new Date();
    const saved = await this.jobAppRepo.save(app);

    await this.notificationsService.create({
      userId: app.job.createdBy,
      type: 'application_withdrawn',
      title: 'Application withdrawn',
      message: `An application for ${app.job.title} was withdrawn.`,
      data: {
        jobId: app.jobId,
        applicationId: app.id,
        chatId: app.id,
        companyId: app.job.pageId ?? null,
      },
    });

    return {
      message: 'Application withdrawn successfully',
      application: saved,
    };
  }
}
