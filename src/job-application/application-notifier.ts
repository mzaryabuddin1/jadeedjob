import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from './entities/job-application.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MailService } from 'src/notification/mail.service';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { resolveNotificationSettings } from 'src/notification/notification-settings';

const TYPE = 'job_application';

type ApplicationPayload = {
  applicationId: number;
  applicantId: number;
  applicantName: string;
  jobId: number;
};

/**
 * Tells the employer about new applications - but never instantly:
 * every application is queued, and after a short wait (default 30s) ALL
 * applications of that job are merged into ONE notification
 * ("3 people applied to your job ..."). Busy jobs are also spaced out
 * (default: at least 2 minutes between notifications for the same job).
 *
 * Env: APPLICATION_NOTIFY_DELAY_SECONDS (30), APPLICATION_NOTIFY_MIN_GAP_SECONDS (120),
 *      NOTIFICATION_APPLICATION_PATH (deep link, `{id}` = job id, default `/job/{id}/applications`)
 */
@Injectable()
export class ApplicationNotifier implements OnModuleInit {
  private readonly logger = new Logger(ApplicationNotifier.name);

  constructor(
    private readonly queue: NotificationQueueService,
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
  ) {}

  onModuleInit() {
    const num = (v: string | undefined, fallback: number) =>
      v !== undefined && v !== '' && !Number.isNaN(Number(v))
        ? Number(v)
        : fallback;

    this.queue.register(TYPE, {
      delaySeconds: num(process.env.APPLICATION_NOTIFY_DELAY_SECONDS, 30),
      minGapSeconds: num(process.env.APPLICATION_NOTIFY_MIN_GAP_SECONDS, 120),
      handler: (items) => this.flush(items),
    });
  }

  /** Called right after an application is saved. Never throws. */
  async onApplied(job: Job, application: JobApplication) {
    try {
      const applicant = await this.userRepo.findOne({
        where: { id: application.applicantId },
        select: ['id', 'firstName', 'lastName'],
      });
      const applicantName =
        `${applicant?.firstName ?? ''} ${applicant?.lastName ?? ''}`.trim() ||
        'Someone';

      await this.queue.enqueue({
        type: TYPE,
        groupKey: `${TYPE}:${job.id}`,
        recipientId: job.createdBy,
        payload: {
          applicationId: application.id,
          applicantId: application.applicantId,
          applicantName,
          jobId: job.id,
        } satisfies ApplicationPayload,
      });
    } catch (err) {
      this.logger.error(
        `Could not queue notification for application #${application?.id}: ${(err as Error)?.message}`,
      );
    }
  }

  buildPath(jobId: number): string {
    const template =
      process.env.NOTIFICATION_APPLICATION_PATH || '/job/{id}/applications';
    return template.replace('{id}', String(jobId));
  }

  /** Merge all queued applications of ONE job into one notification */
  private async flush(
    items: NotificationQueueItem[],
  ): Promise<'sent' | 'skipped'> {
    const payloads = items.map((i) => i.payload as ApplicationPayload);
    const jobId = payloads[0].jobId;
    const employerId = items[0].recipientId;

    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'title', 'isActive', 'createdBy'],
    });
    if (!job || job.isActive === false) return 'skipped';

    const employer = await this.userRepo.findOne({
      where: { id: employerId },
      select: ['id', 'email', 'fcmTokens', 'notification_settings', 'isBanned'],
    });
    if (!employer || employer.isBanned) return 'skipped';

    const settings = resolveNotificationSettings(
      employer.notification_settings,
    );
    const tokens = settings.push
      ? (employer.fcmTokens || []).filter(Boolean)
      : [];
    const email =
      settings.email && employer.email ? String(employer.email).trim() : '';
    if (!tokens.length && !email) return 'skipped';

    const count = payloads.length;
    const total = await this.appRepo.count({ where: { jobId } });
    const names = [...new Set(payloads.map((p) => p.applicantName))];

    const title = count === 1 ? 'New applicant' : 'New applicants';
    let body =
      count === 1
        ? `${names[0]} applied to your job "${job.title}"`
        : `${count} people applied to your job "${job.title}"`;
    if (total > count) body += ` (${total} total)`;

    const data: Record<string, string> = {
      type: 'job_application',
      jobId: String(jobId),
      jobTitle: job.title,
      title,
      text: body,
      count: String(count),
      totalApplications: String(total),
      applicantIds: payloads
        .slice(0, 10)
        .map((p) => p.applicantId)
        .join(','),
      applicantNames: JSON.stringify(names.slice(0, 3)),
      applicationId: count === 1 ? String(payloads[0].applicationId) : '',
      createdAt: new Date().toISOString(),
      path: this.buildPath(jobId),
    };

    this.logger.log(`Job #${jobId} -> employer #${employerId}: "${body}"`);

    if (tokens.length) {
      const res = await this.firebaseService.sendToTokens(
        tokens,
        { title, body },
        data,
      );
      const errors = Object.entries(res.errors)
        .map(([code, e]) => `${code}x${e.count}`)
        .join(', ');
      this.logger.log(
        `Job #${jobId} push: ${res.success} ok, ${res.failure} failed${errors ? ` (${errors})` : ''}`,
      );
    }

    if (email) {
      const esc = (s: string) =>
        s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      await this.mailService.send({
        to: email,
        subject: body,
        text: `${body}\n\nOpen the JobsLoot app to review the applications.\n\nYou can turn off email notifications anytime in the app settings.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 8px">${esc(title)}</h2><p>${esc(body)}</p><p>Open the JobsLoot app to review the applications.</p><p style="color:#888;font-size:12px">You can turn off email notifications anytime in the app settings.</p></div>`,
      });
    }

    return 'sent';
  }
}
