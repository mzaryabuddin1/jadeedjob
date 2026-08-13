import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Notification } from './entities/notification.entity';
import { User } from 'src/users/entities/user.entity';
import {
  NotificationCategory,
  PushService,
} from 'src/push/push.service';

type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  dedupeKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly pushService: PushService,
  ) {}

  private format(notification: Notification) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      receivedAt: notification.createdAt,
      unread: !notification.readAt,
      data: this.normalizeData(notification.type, notification.data || {}),
    };
  }

  async create(input: CreateNotificationInput) {
    const data = this.normalizeData(input.type, input.data || {});
    const dedupeKey = this.normalizeDedupeKey(input.dedupeKey);
    let notification: Notification;
    let inserted = true;

    if (dedupeKey) {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .insert()
        .values({
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          data,
          dedupeKey,
        })
        .orIgnore()
        .execute();
      inserted = this.wasInserted(result);
      notification = inserted
        ? await this.notificationRepo.findOne({
            where: { id: Number(result.identifiers?.[0]?.id) },
          })
        : await this.notificationRepo.findOne({ where: { dedupeKey } });
    } else {
      notification = await this.notificationRepo.save(
        this.notificationRepo.create({
          ...input,
          data,
          dedupeKey: null,
        }),
      );
    }

    if (!notification) {
      throw new Error('Failed to persist notification');
    }

    if (inserted) {
      await this.pushService
        .sendToUser(
          input.userId,
          this.categoryForType(input.type),
          input.title,
          input.message,
          data,
        )
        .catch((error) =>
          console.error('Push delivery failed', {
            userId: input.userId,
            type: input.type,
            errorCode:
              (error as { code?: string })?.code ||
              (error as Error)?.name ||
              'PUSH_DELIVERY_FAILED',
          }),
        );
    }

    return this.format(notification);
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return [];

    return Promise.all(inputs.map((input) => this.create(input)));
  }

  async createForFilterSubscribers(
    filterId: number,
    title: string,
    message: string,
    data: Record<string, any>,
    excludeUserId?: number,
  ) {
    const users = await this.userRepo.find({
      select: ['id', 'filter_preferences'],
    });

    const notifications = users
      .filter((user) => user.id !== excludeUserId)
      .filter((user) => {
        const preferences = Array.isArray(user.filter_preferences)
          ? user.filter_preferences
          : [];
        return preferences.map(Number).includes(Number(filterId));
      })
      .map((user) => ({
        userId: user.id,
        type: 'job_match',
        title,
        message,
        data,
        dedupeKey: `job_match:${String(data.jobId || '')}:user:${user.id}`,
      }));

    return this.createMany(notifications);
  }

  async list(userId: number, page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (currentPage - 1) * take,
      take,
    });

    return {
      data: notifications.map((notification) => this.format(notification)),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async unreadCount(userId: number) {
    const count = await this.notificationRepo.count({
      where: { userId, readAt: IsNull() },
    });

    return { count };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) {
      throw new ForbiddenException('You cannot update this notification');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }

    return this.format(notification);
  }

  async markAllRead(userId: number) {
    await this.notificationRepo.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );

    return { message: 'Notifications marked as read' };
  }

  private categoryForType(type: string): NotificationCategory {
    if (type.includes('chat') || type.includes('message')) return 'messages';
    if (type.includes('application')) return 'applications';
    if (type.includes('job')) return 'jobs';
    if (type.includes('support')) return 'support';
    if (type.includes('company') || type.includes('access')) return 'company';
    if (type.includes('reel') || type.includes('video')) return 'videos';
    if (type.includes('security') || type.includes('password')) return 'security';
    return 'community';
  }

  private normalizeData(type: string, data: Record<string, any>) {
    return Object.entries({ ...data, schemaVersion: '1', type }).reduce<
      Record<string, any>
    >((result, [key, value]) => {
      if (value === undefined) return result;
      if (value !== null && (key === 'id' || key.endsWith('Id'))) {
        result[key] = String(value);
      } else {
        result[key] = value;
      }
      return result;
    }, {});
  }

  private normalizeDedupeKey(value?: string) {
    const key = String(value || '').trim();
    if (!key) return null;
    if (key.length <= 255) return key;
    return `sha256:${createHash('sha256').update(key).digest('hex')}`;
  }

  private wasInserted(result: { raw?: any; identifiers?: any[] }) {
    if (typeof result.raw?.affectedRows === 'number') {
      return result.raw.affectedRows > 0;
    }
    return Boolean(result.identifiers?.length);
  }
}
