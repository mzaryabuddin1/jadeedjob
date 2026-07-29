import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { PushDevice } from './entities/push-device.entity';
import { RealtimePresenceService } from 'src/realtime/realtime-presence.service';

export type NotificationCategory =
  | 'jobs'
  | 'applications'
  | 'messages'
  | 'community'
  | 'videos'
  | 'company'
  | 'support'
  | 'security';

@Injectable()
export class PushService {
  constructor(
    @InjectRepository(PushDevice)
    private readonly deviceRepo: Repository<PushDevice>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    private readonly firebaseService: FirebaseService,
    private readonly presenceService: RealtimePresenceService,
  ) {}

  async upsertDevice(
    userId: number,
    input: {
      installationId: string;
      token: string;
      platform: 'ios' | 'android';
      appVersion?: string;
      locale?: string;
    },
  ) {
    const saved = await this.deviceRepo.manager.transaction(async (manager) => {
      await manager
        .getRepository(PushDevice)
        .createQueryBuilder()
        .delete()
        .where('token = :token', { token: input.token })
        .andWhere(
          '(userId != :userId OR installationId != :installationId)',
          { userId, installationId: input.installationId },
        )
        .execute();
      let device = await manager.getRepository(PushDevice).findOne({
        where: { userId, installationId: input.installationId },
      });
      if (!device) {
        device = manager.getRepository(PushDevice).create({ userId });
      }
      Object.assign(device, input, { lastSeenAt: new Date() });
      return manager.save(device);
    });
    return { device: this.formatDevice(saved) };
  }

  async listDevices(userId: number) {
    const devices = await this.deviceRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return { data: devices.map((device) => this.formatDevice(device)) };
  }

  async updateDevice(
    userId: number,
    installationId: string,
    input: Partial<{
      token: string;
      appVersion: string;
      locale: string;
      platform: 'ios' | 'android';
    }>,
  ) {
    const device = await this.deviceRepo.findOne({
      where: { userId, installationId },
    });
    if (!device) throw new NotFoundException('Push device not found');
    Object.assign(device, input, { lastSeenAt: new Date() });
    return { device: this.formatDevice(await this.deviceRepo.save(device)) };
  }

  async removeDevice(userId: number, installationId: string) {
    await this.deviceRepo.delete({ userId, installationId });
    return { message: 'Push device removed successfully' };
  }

  async removeAllForUser(userId: number) {
    await this.deviceRepo.delete({ userId });
  }

  async getPreferences(userId: number) {
    return { preferences: this.formatPreferences(await this.getOrCreatePreferences(userId)) };
  }

  async updatePreferences(
    userId: number,
    patch: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'updatedAt'>>,
  ) {
    const preferences = await this.getOrCreatePreferences(userId);
    Object.assign(preferences, patch);
    return {
      preferences: this.formatPreferences(
        await this.preferenceRepo.save(preferences),
      ),
    };
  }

  async sendToUser(
    userId: number,
    category: NotificationCategory,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    const preferences = await this.getOrCreatePreferences(userId);
    if (
      category !== 'security' &&
      (!preferences.enabled || !preferences[category])
    ) {
      return { delivered: 0, skipped: true };
    }
    const conversationId = String(
      data.conversationId || data.chatId || '',
    ).trim();
    if (
      category === 'messages' &&
      conversationId &&
      (await this.presenceService.isActive(userId, conversationId))
    ) {
      return { delivered: 0, skipped: true };
    }

    const devices = await this.deviceRepo.find({ where: { userId } });
    if (!devices.length) return { delivered: 0, skipped: false };
    const payload = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );
    const result = await this.firebaseService.sendNotification(
      devices.map((device) => device.token),
      title,
      body,
      payload,
    );

    const invalidTokens = new Set(result.invalidTokens || []);
    if (invalidTokens.size) {
      await this.deviceRepo
        .createQueryBuilder()
        .delete()
        .where('token IN (:...tokens)', { tokens: [...invalidTokens] })
        .execute();
    }
    return { delivered: result.successCount, skipped: false };
  }

  private async getOrCreatePreferences(userId: number) {
    const existing = await this.preferenceRepo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.preferenceRepo.save(this.preferenceRepo.create({ userId }));
  }

  private formatDevice(device: PushDevice) {
    return {
      installationId: device.installationId,
      platform: device.platform,
      appVersion: device.appVersion || null,
      locale: device.locale || null,
      updatedAt: device.updatedAt,
    };
  }

  private formatPreferences(preferences: NotificationPreference) {
    return {
      enabled: preferences.enabled,
      jobs: preferences.jobs,
      applications: preferences.applications,
      messages: preferences.messages,
      community: preferences.community,
      videos: preferences.videos,
      company: preferences.company,
      support: preferences.support,
    };
  }
}
