import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { Filter, FilterIcon } from 'src/filter/entities/filter.entity';
import { normalizeFilterIcon } from 'src/filter/entities/filter.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MailService } from './mail.service';
import { resolveNotificationSettings } from './notification-settings';

type MatchGroup = {
  matched: Filter[];
  pushTokens: string[];
  emails: string[];
};

const USER_BATCH = 500;
const EMAIL_CONCURRENCY = 10;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) {}

  // ────────────────────────────────────────────────
  // JOB CREATED → notify users who prefer any of the job's filters
  // ────────────────────────────────────────────────
  /**
   * Rules:
   * - recipients = users whose `filter_preferences` contain at least one of
   *   the job's filters, except the job creator and banned users
   * - ONE notification per user (even if several filters match), listing the
   *   filters that matched THAT user
   * - each channel is sent only if the user enabled it in
   *   `notification_settings` (push → FCM tokens, email → account email)
   * Never throws: failures are logged so job creation is never affected.
   */
  async notifyJobCreated(job: Job): Promise<void> {
    try {
      const filters = job.filters || [];
      if (!filters.length || job.isActive === false) return;

      const groups = await this.collectRecipients(job, filters);
      if (!groups.size) {
        this.logger.log(`Job #${job.id}: no matching recipients`);
        return;
      }

      let pushUsers = 0;
      let pushOk = 0;
      let pushFailed = 0;
      let emailSent = 0;
      let emailSkipped = 0;
      let emailFailed = 0;

      for (const group of groups.values()) {
        const message = this.buildJobMessage(job, group.matched);

        if (group.pushTokens.length) {
          pushUsers += group.pushTokens.length;
          try {
            const res = await this.firebaseService.sendToTokens(
              group.pushTokens,
              { title: message.title, body: message.body },
              message.data,
            );
            pushOk += res.success;
            pushFailed += res.failure;
          } catch (err) {
            pushFailed += group.pushTokens.length;
            this.logger.error(
              `Job #${job.id}: push send failed — ${(err as Error)?.message}`,
            );
          }
        }

        for (let i = 0; i < group.emails.length; i += EMAIL_CONCURRENCY) {
          const results = await Promise.allSettled(
            group.emails
              .slice(i, i + EMAIL_CONCURRENCY)
              .map((to) =>
                this.mailService.send({
                  to,
                  ...this.buildJobEmail(job, message),
                }),
              ),
          );
          for (const r of results) {
            if (r.status === 'rejected') emailFailed++;
            else if (r.value) emailSent++;
            else emailSkipped++;
          }
        }
      }

      this.logger.log(
        `Job #${job.id} notified — push: ${pushUsers} device(s) (${pushOk} ok, ${pushFailed} failed); ` +
          `email: ${emailSent} sent, ${emailSkipped} skipped (SMTP off), ${emailFailed} failed`,
      );
    } catch (err) {
      this.logger.error(
        `Job #${job.id}: notification failed — ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    }
  }

  /** Users grouped by the exact set of filters that matched them */
  private async collectRecipients(
    job: Job,
    filters: Filter[],
  ): Promise<Map<string, MatchGroup>> {
    const groups = new Map<string, MatchGroup>();
    const filterIds = filters.map((f) => f.id);
    let lastId = 0;

    for (;;) {
      const users = await this.userRepo
        .createQueryBuilder('u')
        .select([
          'u.id',
          'u.email',
          'u.fcmTokens',
          'u.filter_preferences',
          'u.notification_settings',
        ])
        .where('u.id > :lastId', { lastId })
        .andWhere('u.id != :creatorId', { creatorId: job.createdBy })
        .andWhere('u.isBanned = false')
        .andWhere(
          new Brackets((qb) => {
            filterIds.forEach((id, i) =>
              qb.orWhere(`FIND_IN_SET(:fid${i}, u.filter_preferences) > 0`, {
                [`fid${i}`]: id,
              }),
            );
          }),
        )
        .orderBy('u.id', 'ASC')
        .take(USER_BATCH)
        .getMany();

      if (!users.length) break;
      lastId = users[users.length - 1].id;

      for (const user of users) {
        const prefs = new Set((user.filter_preferences || []).map(Number));
        const matched = filters.filter((f) => prefs.has(f.id));
        if (!matched.length) continue;

        const settings = resolveNotificationSettings(
          user.notification_settings,
        );
        const tokens = settings.push
          ? (user.fcmTokens || []).filter(Boolean)
          : [];
        const email =
          settings.email && user.email ? String(user.email).trim() : '';
        if (!tokens.length && !email) continue;

        const key = matched
          .map((f) => f.id)
          .sort((a, b) => a - b)
          .join(',');
        let group = groups.get(key);
        if (!group) {
          group = { matched, pushTokens: [], emails: [] };
          groups.set(key, group);
        }
        group.pushTokens.push(...tokens);
        if (email) group.emails.push(email);
      }

      if (users.length < USER_BATCH) break;
    }

    return groups;
  }

  // ────────────────────────────────────────────────
  // MESSAGE BUILDERS
  // ────────────────────────────────────────────────

  /**
   * Deep link path the app opens on tap. Configure with env
   * NOTIFICATION_JOB_PATH, `{id}` is replaced by the job id.
   */
  buildJobPath(jobId: number): string {
    const template = process.env.NOTIFICATION_JOB_PATH || '/job/{id}';
    return template.replace('{id}', String(jobId));
  }

  /** FCM can't carry big SVGs (4KB limit) — custom icons send type only */
  private slimIcon(icon: FilterIcon | string | null | undefined) {
    const normalized = normalizeFilterIcon(icon);
    return normalized.type === 'tabler'
      ? { type: 'tabler', name: normalized.name }
      : { type: 'custom' };
  }

  private buildJobMessage(job: Job, matched: Filter[]) {
    const names = matched.map((f) => f.name);
    const body = `Job created in ${names.join(', ')} ${
      names.length > 1 ? 'filters' : 'filter'
    }`;
    const title = `New job: ${job.title}`;
    const createdAt = (
      job.createdAt ? new Date(job.createdAt) : new Date()
    ).toISOString();

    // FCM data payload — every value must be a string
    const data: Record<string, string> = {
      type: 'job_created',
      jobId: String(job.id),
      title: job.title,
      text: body,
      createdAt,
      filterIds: matched.map((f) => f.id).join(','),
      filterIcon: JSON.stringify(this.slimIcon(matched[0].icon)),
      filters: JSON.stringify(
        matched.map((f) => ({
          id: f.id,
          name: f.name,
          icon: this.slimIcon(f.icon),
        })),
      ),
      isRemote: String(!!job.isRemote),
      salaryType: job.salaryType ?? '',
      salaryAmount: job.salaryAmount != null ? String(job.salaryAmount) : '',
      currency: job.currency ?? '',
      companyName: job.page?.company_name ?? '',
      pageId: job.pageId != null ? String(job.pageId) : '',
      path: this.buildJobPath(job.id),
    };

    return { title, body, names, data };
  }

  private buildJobEmail(
    job: Job,
    message: { title: string; body: string },
  ): { subject: string; text: string; html: string } {
    const salary =
      job.salaryAmount != null
        ? `${job.salaryAmount} ${job.currency ?? ''} (${job.salaryType})`.trim()
        : '';
    const company = job.page?.company_name ?? '';

    const lines = [message.body, '', `Job: ${job.title}`];
    if (company) lines.push(`Company: ${company}`);
    if (salary) lines.push(`Salary: ${salary}`);
    if (job.isRemote) lines.push('Remote job');
    lines.push(
      '',
      'Open the JobsLoot app to view and apply.',
      '',
      'You can turn off email notifications anytime in the app settings.',
    );

    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 8px">${esc(message.title)}</h2>
<p style="margin:0 0 12px;color:#444">${esc(message.body)}</p>
<ul style="padding-left:18px;color:#222">
<li><b>Job:</b> ${esc(job.title)}</li>
${company ? `<li><b>Company:</b> ${esc(company)}</li>` : ''}
${salary ? `<li><b>Salary:</b> ${esc(salary)}</li>` : ''}
${job.isRemote ? '<li>Remote job</li>' : ''}
</ul>
<p>Open the JobsLoot app to view and apply.</p>
<p style="color:#888;font-size:12px">You can turn off email notifications anytime in the app settings.</p>
</div>`;

    return { subject: message.title, text: lines.join('\n'), html };
  }
}
