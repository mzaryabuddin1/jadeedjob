import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  CHAT_MONGO_STORE,
  ChatMongoStorePort,
} from './storage/chat-mongo.store';

@Injectable()
export class ChatOutboxProcessor {
  private running = false;

  constructor(
    @Inject(CHAT_MONGO_STORE)
    private readonly mongoStore: ChatMongoStorePort,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Interval(5_000)
  async deliverPendingEvents() {
    if (!this.mongoStore.enabled || this.running) return;
    this.running = true;
    try {
      for (let processed = 0; processed < 25; processed += 1) {
        const event = await this.mongoStore.claimOutboxEvent();
        if (!event) break;
        try {
          if (event.type === 'notification') {
            await this.notificationsService.create(event.payload);
          }
          await this.mongoStore.completeOutboxEvent(event.id);
        } catch (error) {
          await this.mongoStore.retryOutboxEvent(
            event.id,
            (error as any)?.code ||
              (error as Error)?.name ||
              'CHAT_OUTBOX_DELIVERY_FAILED',
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
