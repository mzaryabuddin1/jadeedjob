import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
      data: notification.data || {},
    };
  }

  async create(input: CreateNotificationInput) {
    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        ...input,
        data: input.data || {},
      }),
    );

    await this.pushService
      .sendToUser(
        input.userId,
        this.categoryForType(input.type),
        input.title,
        input.message,
        input.data || {},
      )
      .catch((error) =>
        console.error('Push delivery failed', {
          userId: input.userId,
          type: input.type,
          error: (error as Error).message,
        }),
      );

    return this.format(notification);
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return [];

    const notifications = await this.notificationRepo.save(
      inputs.map((input) =>
        this.notificationRepo.create({
          ...input,
          data: input.data || {},
        }),
      ),
    );

    await Promise.all(
      inputs.map((input) =>
        this.pushService
          .sendToUser(
            input.userId,
            this.categoryForType(input.type),
            input.title,
            input.message,
            input.data || {},
          )
          .catch(() => undefined),
      ),
    );

    return notifications.map((notification) => this.format(notification));
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
}
