import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RealtimePresenceService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly instanceId = randomUUID();
  private readonly local = new Map<string, Set<string>>();
  private readonly socketKeys = new Map<string, Set<string>>();
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

  async markActive(userId: number, conversationId: string, socketId: string) {
    const key = this.key(userId, conversationId);
    const sockets = this.local.get(key) || new Set<string>();
    sockets.add(socketId);
    this.local.set(key, sockets);
    const keys = this.socketKeys.get(socketId) || new Set<string>();
    keys.add(key);
    this.socketKeys.set(socketId, keys);
    if (this.redis) {
      await this.redis.hSet(key, `${this.instanceId}:${socketId}`, Date.now());
      await this.redis.expire(key, 2 * 60 * 60);
    }
  }

  async markInactive(
    userId: number,
    conversationId: string,
    socketId: string,
  ) {
    await this.removeSocketFromKey(this.key(userId, conversationId), socketId);
  }

  async clearSocket(socketId: string) {
    const keys = [...(this.socketKeys.get(socketId) || [])];
    await Promise.all(keys.map((key) => this.removeSocketFromKey(key, socketId)));
    this.socketKeys.delete(socketId);
  }

  async isActive(userId: number, conversationId: string) {
    const key = this.key(userId, conversationId);
    if ((this.local.get(key)?.size || 0) > 0) return true;
    return this.redis ? (await this.redis.hLen(key)) > 0 : false;
  }

  private async removeSocketFromKey(key: string, socketId: string) {
    const sockets = this.local.get(key);
    sockets?.delete(socketId);
    if (!sockets?.size) this.local.delete(key);
    const keys = this.socketKeys.get(socketId);
    keys?.delete(key);
    if (!keys?.size) this.socketKeys.delete(socketId);
    if (this.redis) {
      await this.redis.hDel(key, `${this.instanceId}:${socketId}`);
    }
  }

  private key(userId: number, conversationId: string) {
    return `presence:chat:${userId}:${conversationId}`;
  }
}
