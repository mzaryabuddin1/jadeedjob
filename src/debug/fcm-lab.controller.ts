import {
  BadRequestException,
  CanActivate,
  Body,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  NotFoundException,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import { In, Like, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { JobApplicationService } from 'src/job-application/job-application.service';
import { ApplicationNotifier } from 'src/job-application/application-notifier';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import { MailService } from 'src/notification/mail.service';
import { JobService } from 'src/job/job.service';
import { resolveNotificationSettings } from 'src/notification/notification-settings';

/**
 * Protects the FCM lab. Works in production too, but ONLY when the env
 * DEBUG_LAB_KEY is set and the request sends the same value in the
 * `x-debug-key` header. Unset the env var to switch the lab off (404).
 */
@Injectable()
export class DebugLabGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.DEBUG_LAB_KEY;
    if (!expected) throw new NotFoundException();

    const given = String(
      context.switchToHttp().getRequest().headers['x-debug-key'] ?? '',
    );
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid debug key');
    }
    return true;
  }
}

/**
 * Backend of public/fcm-lab.html — diagnose push notifications end to end.
 * Hidden from Swagger on purpose.
 */
@ApiExcludeController()
@UseGuards(DebugLabGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('debug/fcm')
export class FcmLabController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    @InjectRepository(NotificationQueueItem)
    private readonly queueRepo: Repository<NotificationQueueItem>,
    private readonly jobApplicationService: JobApplicationService,
    private readonly applicationNotifier: ApplicationNotifier,
    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly jobService: JobService,
  ) {}

  @Get('status')
  async status() {
    const [usersTotal, usersWithTokens] = await Promise.all([
      this.userRepo.count(),
      this.userRepo
        .createQueryBuilder('u')
        .where("u.fcmTokens IS NOT NULL AND u.fcmTokens != ''")
        .getCount(),
    ]);

    return {
      nodeEnv: process.env.NODE_ENV ?? '(not set)',
      firebaseProjectId: this.firebaseService.getProjectId() ?? '(unknown)',
      smtpConfigured: this.mailService.isConfigured,
      deepLinkTemplate: process.env.NOTIFICATION_JOB_PATH || '/job/{id}',
      usersTotal,
      usersWithTokens,
    };
  }

  @Get('users')
  async users(@Query('search') search?: string, @Query('limit') limit = '200') {
    const take = Math.min(500, Math.max(1, Number(limit) || 200));
    const term = String(search ?? '').trim();

    const users = await this.userRepo.find({
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'isBanned',
        'fcmTokens',
        'filter_preferences',
        'notification_settings',
        'createdAt',
      ],
      where: term
        ? [
            { firstName: Like(`%${term}%`) },
            { lastName: Like(`%${term}%`) },
            { email: Like(`%${term}%`) },
            { phone: Like(`%${term}%`) },
          ]
        : undefined,
      order: { id: 'DESC' },
      take,
    });

    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      email: u.email,
      phone: u.phone,
      isBanned: u.isBanned,
      fcmTokens: (u.fcmTokens || []).filter(Boolean),
      filterPreferences: (u.filter_preferences || []).map(Number),
      notificationSettings: resolveNotificationSettings(
        u.notification_settings,
      ),
      createdAt: u.createdAt,
    }));
  }

  // ────────────────────────────────────────────────
  // JOBS & APPLICATIONS (test the "someone applied" notification)
  // ────────────────────────────────────────────────

  @Get('jobs')
  async jobs(@Query('limit') limit = '60') {
    const take = Math.min(200, Math.max(1, Number(limit) || 60));
    const jobs = await this.jobRepo.find({
      order: { id: 'DESC' },
      take,
      relations: ['filters'],
    });

    const jobIds = jobs.map((j) => j.id);
    const creatorIds = [...new Set(jobs.map((j) => j.createdBy))];

    const counts: { jobId: number; n: string }[] = jobIds.length
      ? await this.appRepo
          .createQueryBuilder('a')
          .select('a.jobId', 'jobId')
          .addSelect('COUNT(*)', 'n')
          .where('a.jobId IN (:...jobIds)', { jobIds })
          .groupBy('a.jobId')
          .getRawMany()
      : [];
    const countByJob = new Map(
      counts.map((c) => [Number(c.jobId), Number(c.n)]),
    );

    const creators = creatorIds.length
      ? await this.userRepo.find({
          where: { id: In(creatorIds) },
          select: [
            'id',
            'firstName',
            'lastName',
            'fcmTokens',
            'email',
            'notification_settings',
          ],
        })
      : [];
    const creatorById = new Map(creators.map((u) => [u.id, u]));

    return {
      timing: this.applicationNotifier.getTiming(),
      jobs: jobs.map((j) => {
        const c = creatorById.get(j.createdBy);
        const settings = resolveNotificationSettings(c?.notification_settings);
        const devices = (c?.fcmTokens || []).filter(Boolean).length;
        return {
          id: j.id,
          title: j.title,
          isActive: j.isActive,
          isTest: j.title.startsWith('[FCM TEST]'),
          filters: (j.filters || []).map((f) => f.name),
          applications: countByJob.get(j.id) ?? 0,
          createdAt: j.createdAt,
          employer: {
            id: j.createdBy,
            name: `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim(),
            pushDevices: settings.push ? devices : 0,
            pushEnabled: settings.push,
            emailEnabled: settings.email && !!c?.email,
            willBeNotified:
              settings.push && devices > 0
                ? true
                : settings.email && !!c?.email,
            whyNot:
              settings.push && devices > 0
                ? ''
                : settings.email && c?.email
                  ? ''
                  : !settings.push
                    ? 'employer turned push off'
                    : 'employer has no FCM token saved',
          },
        };
      }),
    };
  }

  /**
   * Apply to a job as one or more users through the REAL apply code
   * (so the employer notification is queued/batched exactly like production).
   * Jobs that are not "[FCM TEST]" jobs need confirmReal=true because the
   * real employer would get a real notification.
   */
  @Post('apply')
  async apply(
    @Body()
    body: {
      jobId: number;
      applicantIds: number[];
      confirmReal?: boolean;
    },
  ) {
    const jobId = Number(body.jobId);
    const applicantIds = [
      ...new Set((body.applicantIds || []).map(Number)),
    ].filter((n) => n > 0);
    if (!jobId) throw new BadRequestException('Send jobId');
    if (!applicantIds.length) {
      throw new BadRequestException('Tick at least one applicant');
    }

    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'title', 'isActive', 'createdBy'],
    });
    if (!job) throw new NotFoundException('Job not found');
    if (!job.title.startsWith('[FCM TEST]') && !body.confirmReal) {
      throw new BadRequestException(
        'This is not an [FCM TEST] job - the real employer would be notified. Send confirmReal=true to continue.',
      );
    }

    const results = [];
    for (const applicantId of applicantIds) {
      try {
        const app: any = await this.jobApplicationService.apply({
          jobId,
          applicantId,
        });
        results.push({ applicantId, ok: true, applicationId: app.id });
      } catch (err: any) {
        results.push({
          applicantId,
          ok: false,
          message: err?.response?.message ?? err?.message ?? 'failed',
        });
      }
    }

    return {
      applied: results.filter((r) => r.ok).length,
      results,
      timing: this.applicationNotifier.getTiming(),
      note: 'The employer notification is queued and sent after the delay (see Queue panel).',
    };
  }

  /** Queue rows of a job: when will the employer be notified, and what happened */
  @Get('queue')
  async queue(@Query('jobId') jobId: string) {
    const id = Number(jobId);
    if (!id) throw new BadRequestException('Send jobId');

    const rows = await this.queueRepo.find({
      where: { groupKey: `job_application:${id}` },
      order: { id: 'DESC' },
      take: 25,
    });

    const timing = this.applicationNotifier.getTiming();
    const pending = rows.filter((r) => r.status === 'pending');
    const lastSent = rows.find((r) => r.status === 'sent');

    let estimatedSendAt: Date | null = null;
    if (pending.length) {
      const first = Math.min(
        ...pending.map((r) => new Date(r.queuedAt).getTime()),
      );
      let at = first + timing.delaySeconds * 1000;
      if (lastSent?.processedAt && timing.minGapSeconds > 0) {
        at = Math.max(
          at,
          new Date(lastSent.processedAt).getTime() +
            timing.minGapSeconds * 1000,
        );
      }
      estimatedSendAt = new Date(at);
    }

    return {
      now: new Date(),
      timing,
      pendingCount: pending.length,
      estimatedSendAt,
      rows: rows.map((r) => ({
        id: r.id,
        status: r.status,
        applicant: r.payload?.applicantName ?? '',
        queuedAt: r.queuedAt,
        processedAt: r.processedAt,
        attempts: r.attempts,
        note: r.note ?? r.lastError ?? '',
      })),
    };
  }

  /** Delete the applications + queue rows of a TEST job so you can apply again */
  @Post('reset-job')
  async resetJob(@Body() body: { jobId: number }) {
    const jobId = Number(body.jobId);
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'title'],
    });
    if (!job) throw new NotFoundException('Job not found');
    if (!job.title.startsWith('[FCM TEST]')) {
      throw new BadRequestException('Only [FCM TEST] jobs can be reset here');
    }

    const apps = await this.appRepo.delete({ jobId });
    const queued = await this.queueRepo.delete({
      groupKey: `job_application:${jobId}`,
    });
    return {
      jobId,
      applicationsDeleted: apps.affected,
      queueRowsDeleted: queued.affected,
    };
  }

  /** Send a test push to every token of a user, or to one raw token */
  @Post('test-push')
  async testPush(@Body() body: { userId?: number; token?: string }) {
    let tokens: string[] = [];

    if (body.token) {
      tokens = [String(body.token).trim()];
    } else if (body.userId) {
      const user = await this.userRepo.findOne({
        where: { id: Number(body.userId) },
        select: ['id', 'fcmTokens'],
      });
      if (!user) throw new NotFoundException('User not found');
      tokens = (user.fcmTokens || []).filter(Boolean);
      if (!tokens.length) {
        throw new BadRequestException(
          'This user has NO fcm token saved. The app must send `fcmToken` on login/register.',
        );
      }
    } else {
      throw new BadRequestException('Send userId or token');
    }

    const results = await this.firebaseService.sendDetailed(
      tokens,
      {
        title: 'FCM lab test',
        body: `Test push sent at ${new Date().toLocaleTimeString()}`,
      },
      { type: 'fcm_lab_test' },
    );
    return { sent: tokens.length, results };
  }

  /** Dry run: who would get a notification for a job with these filters? */
  @Post('explain')
  async explain(@Body() body: { filterIds: number[]; creatorId: number }) {
    const filterIds = (body.filterIds || []).map(Number).filter((n) => n > 0);
    if (!filterIds.length) throw new BadRequestException('Send filterIds');

    return this.notificationService.explainRecipients(
      filterIds,
      Number(body.creatorId) || 0,
    );
  }

  /**
   * Create a real test job through the normal job code and notify.
   * By default ONLY `onlyUserIds` are notified, so real users are safe;
   * `notifyAllMatching: true` is required to notify everybody who matches.
   */
  @Post('create-job')
  async createJob(
    @Body()
    body: {
      creatorId: number;
      filterIds: number[];
      title?: string;
      onlyUserIds?: number[];
      notifyAllMatching?: boolean;
      deactivate?: boolean;
    },
  ) {
    const creatorId = Number(body.creatorId);
    const filterIds = (body.filterIds || []).map(Number).filter((n) => n > 0);
    const onlyUserIds = (body.onlyUserIds || [])
      .map(Number)
      .filter((n) => n > 0);

    if (!creatorId) throw new BadRequestException('Send creatorId');
    if (!filterIds.length) throw new BadRequestException('Send filterIds');
    if (!onlyUserIds.length && !body.notifyAllMatching) {
      throw new BadRequestException(
        'Pick recipients (onlyUserIds) or set notifyAllMatching=true (notifies REAL users)',
      );
    }

    const job: any = await this.jobService.createJob(
      {
        // always keep the [FCM TEST] prefix: it marks the job as a lab job
        // (Activate/Hide/Reset buttons and the real-employer safety check)
        title: (() => {
          const custom = body.title?.trim();
          if (!custom) return `[FCM TEST] ${new Date().toISOString()}`;
          return custom.startsWith('[FCM TEST]')
            ? custom
            : `[FCM TEST] ${custom}`;
        })(),
        description: 'Created by the FCM lab to test push notifications',
        filterIds,
        isRemote: true,
        salaryType: 'daily-wage',
        salaryAmount: 1000,
        currency: 'PKR',
      },
      creatorId,
      { skipNotification: true },
    );

    const notification = await this.notificationService.notifyJobCreated(job, {
      onlyUserIds: body.notifyAllMatching ? undefined : onlyUserIds,
    });

    let deactivated = false;
    if (body.deactivate === true) {
      await this.jobService.updateJob(job.id, { isActive: false }, creatorId);
      deactivated = true;
    }

    return {
      job: { id: job.id, title: job.title, filterIds: job.filterIds },
      deactivated,
      notification:
        notification ??
        'No notification summary (job had no filters or no recipients)',
      path: this.notificationService.buildJobPath(job.id),
    };
  }
}
