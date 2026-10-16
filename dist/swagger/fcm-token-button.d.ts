export type FcmWebConfig = {
    apiKey?: string;
    appId?: string;
    messagingSenderId?: string;
    projectId?: string;
    vapidKey?: string;
};
export declare function readFcmWebConfig(): FcmWebConfig;
export declare function buildServiceWorker(cfg: FcmWebConfig): string;
export declare function buildFcmButtonScript(cfg: FcmWebConfig): string;
