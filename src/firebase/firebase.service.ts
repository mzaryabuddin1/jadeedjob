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
  // Send one notification (+ data payload) to many device tokens.
  // FCM allows max 500 tokens per multicast, so we chunk.
  // `data` values must be strings (FCM requirement).
  // ────────────────────────────────────────────────
  async sendToTokens(
    tokens: string[],
    notification: { title: string; body: string },
    data: Record<string, string> = {},
  ): Promise<{
    success: number;
    failure: number;
    errors: Record<string, { count: number; hint: string }>;
  }> {
    const results = await this.sendDetailed(tokens, notification, data);

    const errors: Record<string, { count: number; hint: string }> = {};
    for (const r of results) {
      if (r.ok) continue;
      const code = r.code || 'unknown';
      errors[code] = errors[code] || { count: 0, hint: r.hint || '' };
      errors[code].count++;
    }

    const success = results.filter((r) => r.ok).length;
    return { success, failure: results.length - success, errors };
  }

  /**
   * Like sendToTokens but returns the FCM outcome of EVERY token
   * (message id, or error code + human hint). Used by the FCM test lab.
   */
  async sendDetailed(
    tokens: string[],
    notification: { title: string; body: string },
    data: Record<string, string> = {},
  ): Promise<
    {
      token: string;
      ok: boolean;
      messageId?: string;
      code?: string;
      message?: string;
      hint?: string;
    }[]
  > {
    const unique = [...new Set(tokens.filter(Boolean))];
    const out = [];

    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      const res = await this.firebaseApp.messaging().sendEachForMulticast({
        tokens: chunk,
        notification,
        data,
      });

      res.responses.forEach((r, idx) => {
        out.push(
          r.success
            ? { token: chunk[idx], ok: true, messageId: r.messageId }
            : {
                token: chunk[idx],
                ok: false,
                code: r.error?.code,
                message: r.error?.message,
                hint: this.hintForError(r.error?.code),
              },
        );
      });
    }

    return out;
  }

  /** Project the server's service account belongs to (tokens must match it) */
  getProjectId(): string | undefined {
    const opts: any = this.firebaseApp.options;
    return opts?.credential?.projectId ?? opts?.projectId;
  }

  /** Plain-English reason for the most common FCM errors */
  hintForError(code?: string): string {
    switch (code) {
      case 'messaging/registration-token-not-registered':
        return 'Token is stale: app was uninstalled/reinstalled or token refreshed. Re-login in the app to send a fresh fcmToken.';
      case 'messaging/invalid-registration-token':
      case 'messaging/invalid-argument':
        return 'Token is malformed/truncated, or not an FCM token.';
      case 'messaging/mismatched-credential':
      case 'messaging/sender-id-mismatch':
        return "The app was built with a DIFFERENT Firebase project than this server's service account. Use the same project (google-services.json / service account).";
      case 'messaging/third-party-auth-error':
        return 'iOS: APNs key/certificate is missing or invalid in Firebase console → Cloud Messaging.';
      case 'messaging/quota-exceeded':
        return 'FCM rate limit hit — retry later with backoff.';
      case 'messaging/server-unavailable':
      case 'messaging/internal-error':
        return 'FCM temporary problem — safe to retry.';
      case 'messaging/authentication-error':
      case 'app/invalid-credential':
        return 'Server service account is invalid or lacks the FCM permission.';
      default:
        return '';
    }
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
        title: '🔥 Test Notification',
        body: 'Your browser is receiving push notifications!',
      },
    });
  }
}
