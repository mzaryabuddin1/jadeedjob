import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { normalizeCompanyPermissions } from 'src/pages/company-permissions';
import { ChatService } from 'src/chat/chat.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { ModerationService } from 'src/moderation/moderation.service';

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

    @InjectRepository(CompanyPage)
    private companyRepo: Repository<CompanyPage>,

    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private idempotencyService: IdempotencyService,
    private moderationService: ModerationService,
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
    if (!job.pageId) return job.createdBy === userId;
    const company =
      job.page ||
      (await this.companyRepo.findOne({ where: { id: job.pageId } }));
    if (!company || company.verificationStatus !== 'approved') return false;
    if (company.ownerId === userId) return true;

    const member = await this.pageMemberRepo.findOne({
      where: { pageId: job.pageId, userId },
    });
    if (!member || member.hasAccess === false) return false;
    return normalizeCompanyPermissions(
      member.role,
      member.permissions,
    ).viewApplicants;
  }

  async apply(data: {
    jobId: number;
    applicantId: number;
    bidAmount?: number;
    bidCurrency?: string;
    idempotencyKey?: string;
  }) {
    return this.idempotencyService.execute(
      data.applicantId,
      'job_application_apply',
      data.idempotencyKey,
      {
        jobId: data.jobId,
        bidAmount: data.bidAmount ?? null,
        bidCurrency: data.bidCurrency ?? null,
      },
      async () => {
        const result = await this.jobAppRepo.manager.transaction(
          async (manager) => this.applyTransaction(data, manager),
        );
        const conversation =
          await this.chatService.ensureApplicationConversation(result.app.id);
        await this.notificationsService.create({
          userId: result.job.createdBy,
          type: 'job_application',
          title: 'New application received',
          message: `Someone applied to ${result.job.title}.`,
          data: {
            jobId: result.job.id,
            applicationId: result.app.id,
            chatId: conversation.id,
            conversationId: conversation.id,
            companyId: result.job.pageId ?? null,
          },
        });
        return this.applicationMutationResponse(result.app, conversation.id);
      },
    );
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

    const rows = await Promise.all(
      applications.map(async (application) => {
        const conversation =
          await this.chatService.ensureApplicationConversation(application.id);
        return {
          applicationId: application.id,
          id: application.id,
          status: application.status,
          bidAmount:
            application.bidAmount === null
              ? null
              : Number(application.bidAmount),
          bidCurrency: application.bidCurrency || null,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          job: this.getJobSummary(application.job),
          employer: this.getEmployerSummary(application.job),
          chatId: conversation.id,
          conversationId: conversation.id,
          legacyApplicationChatId: application.id,
        };
      }),
    );
    return {
      data: rows,
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
      data: await Promise.all(applications.map(async (application) => {
        const applicant = application.applicant;
        const review = reviewsByApplicationId.get(application.id);
        const ratingAverage = Number(applicant?.ratingAverage || 0);
        const ratingCount = Number(applicant?.ratingCount || 0);
        const conversation =
          await this.chatService.ensureApplicationConversation(application.id);

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
          bidAmount:
            application.bidAmount === null
              ? null
              : Number(application.bidAmount),
          bidCurrency: application.bidCurrency || null,
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
          chatId: conversation.id,
          conversationId: conversation.id,
          legacyApplicationChatId: application.id,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        };
      })),
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
    if (!['accepted', 'rejected', 'pending', 'completed'].includes(status)) {
      throw new BadRequestException('Employer cannot set this application status');
    }
    const saved = await this.jobAppRepo.manager.transaction(async (manager) => {
      const app = await manager.getRepository(JobApplication).findOne({
        where: { id },
        relations: ['job', 'job.page', 'job.creator'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!app) throw new NotFoundException('Application not found');
      if (!(await this.canManageJob(app.job, employerId))) {
        throw new ForbiddenException('You cannot update this application');
      }
      this.assertEmployerTransition(app.status as ApplicationStatus, status);
      if (status === 'accepted') {
        await this.assertVacancyAvailable(app.job, manager, app.id);
      }
      app.status = status;
      app.completedAt = status === 'completed' ? new Date() : null;
      app.withdrawnAt = null;
      return manager.save(app);
    });
    await this.chatService.syncApplicationConversation(saved.id, saved.status);
    const conversation =
      await this.chatService.ensureApplicationConversation(saved.id);
    const job = await this.jobRepo.findOne({
      where: { id: saved.jobId },
      relations: ['page'],
    });
    await this.notificationsService.create({
      userId: saved.applicantId,
      type: 'application_status',
      title: 'Application status updated',
      message: `Your application for ${job.title} is now ${status}.`,
      data: {
        jobId: saved.jobId,
        applicationId: saved.id,
        chatId: conversation.id,
        conversationId: conversation.id,
        companyId: job.pageId ?? null,
      },
    });
    return this.applicationMutationResponse(saved, conversation.id);
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

    if (!['pending', 'rejected'].includes(app.status)) {
      throw new BadRequestException('This application cannot be withdrawn');
    }
    app.status = 'withdrawn';
    app.withdrawnAt = new Date();
    const saved = await this.jobAppRepo.save(app);
    await this.chatService.syncApplicationConversation(saved.id, saved.status);
    const conversation =
      await this.chatService.ensureApplicationConversation(saved.id);

    await this.notificationsService.create({
      userId: app.job.createdBy,
      type: 'application_withdrawn',
      title: 'Application withdrawn',
      message: `An application for ${app.job.title} was withdrawn.`,
      data: {
        jobId: app.jobId,
        applicationId: app.id,
        chatId: conversation.id,
        conversationId: conversation.id,
        companyId: app.job.pageId ?? null,
      },
    });

    return {
      message: 'Application withdrawn successfully',
      application: this.applicationMutationResponse(saved, conversation.id),
    };
  }

  private async applyTransaction(
    data: {
      jobId: number;
      applicantId: number;
      bidAmount?: number;
      bidCurrency?: string;
      idempotencyKey?: string;
    },
    manager: EntityManager,
  ) {
    const job = await manager.getRepository(Job).findOne({
      where: { id: data.jobId },
      relations: ['page', 'creator'],
      lock: { mode: 'pessimistic_read' },
    });
    if (
      !job ||
      !job.isActive ||
      job.status !== 'active' ||
      (job.pageId && job.page?.verificationStatus !== 'approved')
    ) {
      throw new BadRequestException('Job does not exist or is not active');
    }
    if (job.createdBy === data.applicantId) {
      throw new BadRequestException('You cannot apply to your own job');
    }
    await this.moderationService.assertInteractionAllowed(
      data.applicantId,
      job.pageId ? 'company' : 'user',
      job.pageId || job.createdBy,
    );
    const negotiable = job.salaryType === 'negotiable';
    if (negotiable && !(Number(data.bidAmount) > 0)) {
      throw new BadRequestException('A positive bidAmount is required for negotiable jobs');
    }
    if (!negotiable && data.bidAmount !== undefined) {
      throw new BadRequestException('Bids are only allowed for negotiable jobs');
    }

    let app = await manager.getRepository(JobApplication).findOne({
      where: { jobId: data.jobId, applicantId: data.applicantId },
      lock: { mode: 'pessimistic_write' },
    });
    if (app && app.status !== 'withdrawn') {
      throw new BadRequestException('You already applied to this job');
    }
    if (!app) {
      app = manager.getRepository(JobApplication).create({
        jobId: data.jobId,
        applicantId: data.applicantId,
      });
    }
    app.status = 'pending';
    app.withdrawnAt = null;
    app.completedAt = null;
    app.sourceInvitationId = null;
    app.bidAmount = negotiable ? Number(data.bidAmount) : null;
    app.bidCurrency = negotiable
      ? String(data.bidCurrency || job.currency || '').trim() || null
      : null;
    app.lastApplyRequestId =
      String(data.idempotencyKey || '').trim() || null;
    return { app: await manager.save(app), job };
  }

  private assertEmployerTransition(
    current: ApplicationStatus,
    next: ApplicationStatus,
  ) {
    if (current === next) return;
    const allowed: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
      pending: ['accepted', 'rejected'],
      rejected: ['pending'],
      accepted: ['completed'],
    };
    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `Application cannot move from ${current} to ${next}`,
      );
    }
  }

  private async assertVacancyAvailable(
    job: Job,
    manager: EntityManager,
    excludedApplicationId: number,
  ) {
    const lockedJob = await manager.getRepository(Job).findOne({
      where: { id: job.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !lockedJob ||
      !lockedJob.isActive ||
      lockedJob.status !== 'active'
    ) {
      throw new BadRequestException('Job is no longer active');
    }
    if (!lockedJob.vacancies) return;
    const occupied = await manager
      .getRepository(JobApplication)
      .createQueryBuilder('application')
      .where('application.jobId = :jobId', { jobId: lockedJob.id })
      .andWhere('application.id != :excludedApplicationId', {
        excludedApplicationId,
      })
      .andWhere('application.status IN (:...statuses)', {
        statuses: ['accepted', 'completed'],
      })
      .getCount();
    if (occupied >= lockedJob.vacancies) {
      throw new BadRequestException({
        code: 'APPLICATION_VACANCIES_FILLED',
        message: 'No vacancies remain for this job',
      });
    }
  }

  private applicationMutationResponse(
    application: JobApplication,
    conversationId: string,
  ) {
    return {
      id: application.id,
      applicationId: application.id,
      jobId: application.jobId,
      applicantId: application.applicantId,
      status: application.status,
      bidAmount:
        application.bidAmount === null
          ? null
          : Number(application.bidAmount),
      bidCurrency: application.bidCurrency || null,
      chatId: conversationId,
      conversationId,
      legacyApplicationChatId: application.id,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
