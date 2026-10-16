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
import { Like, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
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
        title: body.title?.trim() || `[FCM TEST] ${new Date().toISOString()}`,
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
    if (body.deactivate !== false) {
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
