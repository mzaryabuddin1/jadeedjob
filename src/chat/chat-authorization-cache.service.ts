import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

type CompanyChatPermission = 'chatApplicants' | 'postJobs';

@Injectable()
export class ChatAuthorizationCacheService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly ttlSeconds = Math.min(
    300,
    Math.max(1, Number(process.env.CHAT_AUTH_CACHE_TTL_SECONDS || 30)),
  );
  private readonly local = new Map<string, number>();
  private redis: RedisClientType | null = null;

  async onModuleInit() {
    if (!['staging', 'production'].includes(process.env.NODE_ENV || '')) return;
    const redisUrl = String(process.env.REDIS_URL || '').trim();
    if (!redisUrl) throw new Error('REDIS_URL is required');
    this.redis = createClient({ url: redisUrl });
    await this.redis.connect();
  }

  async onApplicationShutdown() {
    if (this.redis?.isOpen) await this.redis.quit();
  }

  async getCompanyPermission(
    companyId: number,
    userId: number,
    permission: CompanyChatPermission,
    loader: () => Promise<boolean>,
  ) {
    const key = this.key(companyId, userId, permission);
    if (await this.has(key)) return true;

    const allowed = await loader();
    if (allowed) await this.put(key);
    return allowed;
  }

  async invalidateCompanyUser(companyId: number, userId: number) {
    const prefix = this.keyPrefix(companyId, userId);
    for (const key of this.local.keys()) {
      if (key.startsWith(prefix)) this.local.delete(key);
    }
    await this.deleteRedisPattern(`${prefix}*`);
  }

  async invalidateCompany(companyId: number) {
    const prefix = `chat:auth:v1:company:${companyId}:`;
    for (const key of this.local.keys()) {
      if (key.startsWith(prefix)) this.local.delete(key);
    }
    await this.deleteRedisPattern(`${prefix}*`);
  }

  private async has(key: string) {
    const expiresAt = this.local.get(key);
    if (expiresAt && expiresAt > Date.now()) return true;
    if (expiresAt) this.local.delete(key);
    if (!this.redis) return false;
    try {
      return (await this.redis.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  private async put(key: string) {
    this.local.set(key, Date.now() + this.ttlSeconds * 1000);
    if (!this.redis) return;
    try {
      await this.redis.set(key, '1', { EX: this.ttlSeconds });
    } catch {
      // Cache failure never replaces the authoritative MySQL decision.
    }
  }

  private async deleteRedisPattern(pattern: string) {
    if (!this.redis) return;
    try {
      for await (const keys of this.redis.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        const values = Array.isArray(keys) ? keys : [keys];
        if (values.length) await this.redis.del(values);
      }
    } catch {
      // Entries still expire after the intentionally short authorization TTL.
    }
  }

  private keyPrefix(companyId: number, userId: number) {
    return `chat:auth:v1:company:${companyId}:user:${userId}:`;
  }

  private key(
    companyId: number,
    userId: number,
    permission: CompanyChatPermission,
  ) {
    return `${this.keyPrefix(companyId, userId)}permission:${permission}`;
  }
}
