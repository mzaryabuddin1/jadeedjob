import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseApp: admin.app.App,
  ) {}

  // ────────────────────────────────────────────────
  // EXISTING: Send to specific tokens
  // ────────────────────────────────────────────────
  async sendNotification(tokens: string[], title: string, body: string) {
    return this.firebaseApp.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });
  }

  // ────────────────────────────────────────────────
  // NEW: Subscribe token to filter topics
  // ────────────────────────────────────────────────
  async subscribeTokenToFilters(token: string, filterIds: number[]) {
    const topics = filterIds.map((id) => `filter_${id}`);

    for (const topic of topics) {
      await this.firebaseApp.messaging().subscribeToTopic(token, topic);
    }
  }

  // ────────────────────────────────────────────────
  // NEW: Update filter topic subscriptions
  // ────────────────────────────────────────────────
  async updateFilterSubscriptions(
    token: string,
    oldFilters: number[],
    newFilters: number[],
  ) {
    const oldSet = new Set(oldFilters || []);
    const newSet = new Set(newFilters || []);

    const toSubscribe: string[] = [];
    const toUnsubscribe: string[] = [];

    for (const id of newSet) {
      if (!oldSet.has(id)) {
        toSubscribe.push(`filter_${id}`);
      }
    }

    for (const id of oldSet) {
      if (!newSet.has(id)) {
        toUnsubscribe.push(`filter_${id}`);
      }
    }

    if (toSubscribe.length) {
      for (const topic of toSubscribe) {
        await this.firebaseApp.messaging().subscribeToTopic(token, topic);
      }
    }

    if (toUnsubscribe.length) {
      for (const topic of toUnsubscribe) {
        await this.firebaseApp.messaging().unsubscribeFromTopic(token, topic);
      }
    }
  }

  // ────────────────────────────────────────────────
  // NEW: Send notification to filter topic
  // ────────────────────────────────────────────────
  async sendToFilterTopic(
    filterId: number,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    return this.firebaseApp.messaging().send({
      topic: `filter_${filterId}`,
      notification: { title, body },
      data,
    });
  }

 async sendTestToToken(token: string) {
  return this.firebaseApp.messaging().send({
    token,
    notification: {
      title: "🔥 Test Notification",
      body: "Your browser is receiving push notifications!",
    },
  });
}
}
