import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ApplicationNotifier } from './application-notifier';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { isJobEmployer } from 'src/job/job-employer.util';

/** Never send these applicant fields to an employer */
const PRIVATE_USER_FIELDS = [
  'passwordHash',
  'passwordSalt',
  'fcmTokens',
  'notification_settings',
  'googleId',
  'facebookId',
  'bank_name',
  'account_number',
  'iban',
  'branch_name',
  'swift_code',
  'notes',
  'kyc_status',
  'verified_by_admin_id',
  'verification_date',
  'rejection_reason',
  'isBanned',
];

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectRepository(JobApplication)
    private jobAppRepo: Repository<JobApplication>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(CompanyPage)
    private pageRepo: Repository<CompanyPage>,

    private applicationNotifier: ApplicationNotifier,
  ) {}

  async apply(data: { jobId: number; applicantId: number }) {
    const job = await this.jobRepo.findOne({
      where: { id: data.jobId, isActive: true },
    });

    if (!job) {
      throw new BadRequestException('Job does not exist or is not active');
    }

    if (await isJobEmployer(this.pageRepo, job, data.applicantId)) {
      throw new BadRequestException(
        "You cannot apply to your own (or your company's) job",
      );
    }

    // One application per user per job. The job row is locked inside a
    // transaction so two quick taps / parallel requests cannot both pass
    // the "already applied" check.
    const app = await this.jobAppRepo.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder(Job, 'j')
        .select('j.id')
        .where('j.id = :id', { id: data.jobId })
        .setLock('pessimistic_write')
        .getOne();

      const existing = await manager.findOne(JobApplication, {
        where: { jobId: data.jobId, applicantId: data.applicantId },
      });
      if (existing) {
        throw new BadRequestException('You already applied to this job');
      }

      return manager.save(
        manager.create(JobApplication, {
          jobId: data.jobId,
          applicantId: data.applicantId,
        }),
      );
    });

    // Employer is told later, in a batch (see ApplicationNotifier) - never blocks apply
    await this.applicationNotifier.onApplied(job, app);

    return app;
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

  /** Only the employer side (poster, or company page owner/admin/editor) may list applicants */
  async getApplicationsByJob(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'createdBy', 'pageId'],
    });
    if (!job) throw new NotFoundException('Job not found');

    if (!(await isJobEmployer(this.pageRepo, job, userId))) {
      throw new ForbiddenException(
        'Only the employer can see the applications of this job',
      );
    }

    const apps = await this.jobAppRepo.find({
      where: { jobId },
      relations: ['applicant'],
      order: { createdAt: 'DESC' },
    });

    // applicant is a full user row - strip anything private
    for (const a of apps) {
      for (const field of PRIVATE_USER_FIELDS) {
        delete (a.applicant as any)?.[field];
      }
    }
    return apps;
  }

  /**
   * Employer accepts or rejects a pending application. Final: a decided
   * application cannot be changed. Accepting notifies the applicant and
   * opens up ratings for both sides.
   */
  async updateStatus(
    id: number,
    status: 'accepted' | 'rejected',
    userId: number,
  ) {
    const app = await this.jobAppRepo.findOne({
      where: { id },
      relations: ['job'],
    });
    if (!app) throw new NotFoundException('Application not found');

    if (!(await isJobEmployer(this.pageRepo, app.job, userId))) {
      throw new ForbiddenException(
        'Only the employer can accept or reject applications',
      );
    }

    if (app.status !== 'pending') {
      throw new BadRequestException(
        `This application is already ${app.status}`,
      );
    }

    // atomic: two employers (e.g. page admins) clicking at once -> only one wins
    const res = await this.jobAppRepo.update(
      { id, status: 'pending' },
      { status, decidedAt: new Date(), decidedBy: userId },
    );
    if (!res.affected) {
      throw new BadRequestException('This application was already decided');
    }

    const updated = await this.jobAppRepo.findOneOrFail({ where: { id } });

    if (status === 'accepted') {
      // best effort, never blocks or fails the decision
      void this.applicationNotifier.notifyAccepted(updated, app.job);
    }

    return updated;
  }
}
