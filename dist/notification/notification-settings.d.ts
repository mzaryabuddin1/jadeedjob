export type NotificationSettings = {
    push: boolean;
    email: boolean;
};
export declare const NOTIFICATION_CHANNELS: readonly ["push", "email"];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export declare const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings;
export declare function resolveNotificationSettings(stored: Partial<NotificationSettings> | null | undefined): NotificationSettings;
