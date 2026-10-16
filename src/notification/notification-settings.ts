/**
 * Notification channels a user can opt in/out of.
 * To add a channel later (sms, whatsapp, ...): add the key here + its default,
 * the Joi schema in users.controller.ts, and a sender in NotificationService.
 */
export type NotificationSettings = {
  /** Firebase (FCM) push notification to the user's devices */
  push: boolean;
  /** Email to the user's verified account email */
  email: boolean;
};

export const NOTIFICATION_CHANNELS = ['push', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Push stays on (existing behaviour); email is opt-in */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  push: true,
  email: false,
};

export function resolveNotificationSettings(
  stored: Partial<NotificationSettings> | null | undefined,
): NotificationSettings {
  return {
    push:
      typeof stored?.push === 'boolean'
        ? stored.push
        : DEFAULT_NOTIFICATION_SETTINGS.push,
    email:
      typeof stored?.email === 'boolean'
        ? stored.email
        : DEFAULT_NOTIFICATION_SETTINGS.email,
  };
}
