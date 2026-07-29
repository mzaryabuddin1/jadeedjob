import { PushService } from './push.service';
export declare class PushController {
    private readonly pushService;
    constructor(pushService: PushService);
    list(req: any): Promise<{
        data: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        }[];
    }>;
    register(req: any, body: any): Promise<{
        device: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        };
    }>;
    update(req: any, installationId: string, body: any): Promise<{
        device: {
            installationId: string;
            platform: "ios" | "android";
            appVersion: string;
            locale: string;
            updatedAt: Date;
        };
    }>;
    remove(req: any, installationId: string): Promise<{
        message: string;
    }>;
    getPreferences(req: any): Promise<{
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
    updatePreferences(req: any, body: any): Promise<{
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
}
