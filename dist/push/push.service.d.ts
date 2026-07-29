import { Repository } from 'typeorm';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationPreference } from './entities/notification-preference.entity';
import { PushDevice } from './entities/push-device.entity';
import { RealtimePresenceService } from 'src/realtime/realtime-presence.service';
export type NotificationCategory = 'jobs' | 'applications' | 'messages' | 'community' | 'videos' | 'company' | 'support' | 'security';
export declare class PushService {
    private readonly deviceRepo;
    private readonly preferenceRepo;
    private readonly firebaseService;
    private readonly presenceService;
    constructor(deviceRepo: Repository<PushDevice>, preferenceRepo: Repository<NotificationPreference>, firebaseService: FirebaseService, presenceService: RealtimePresenceService);
    upsertDevice(userId: number, input: {
        installationId: string;
        token: string;
        platform: 'ios' | 'android';
        appVersion?: string;
        locale?: string;
    }): Promise<{
        device: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        };
    }>;
    listDevices(userId: number): Promise<{
        data: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        }[];
    }>;
    updateDevice(userId: number, installationId: string, input: Partial<{
        token: string;
        appVersion: string;
        locale: string;
        platform: 'ios' | 'android';
    }>): Promise<{
        device: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        };
    }>;
    removeDevice(userId: number, installationId: string): Promise<{
        message: string;
    }>;
    removeAllForUser(userId: number): Promise<void>;
    getPreferences(userId: number): Promise<{
        preferences: {
            enabled: boolean;
            jobs: boolean;
            applications: boolean;
            messages: boolean;
            community: boolean;
            videos: boolean;
            company: boolean;
            support: boolean;
        };
    }>;
    updatePreferences(userId: number, patch: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'updatedAt'>>): Promise<{
        preferences: {
            enabled: boolean;
            jobs: boolean;
            applications: boolean;
            messages: boolean;
            community: boolean;
            videos: boolean;
            company: boolean;
            support: boolean;
        };
    }>;
    sendToUser(userId: number, category: NotificationCategory, title: string, body: string, data?: Record<string, unknown>): Promise<{
        delivered: number;
        skipped: boolean;
    }>;
    private getOrCreatePreferences;
    private formatDevice;
    private formatPreferences;
}
