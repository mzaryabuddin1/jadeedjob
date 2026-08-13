import { AccountDeletionService } from './account-deletion.service';
export declare class AccountDeletionController {
    private readonly deletionService;
    constructor(deletionService: AccountDeletionService);
    sendOtp(req: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    confirm(req: any, body: any): Promise<{
        status: "scheduled";
        scheduledDeletionAt: Date;
    }>;
}
export declare class AccountRecoveryController {
    private readonly deletionService;
    constructor(deletionService: AccountDeletionService);
    sendOtp(body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    confirm(body: any): Promise<any>;
}
export declare class PublicAccountDeletionController {
    private readonly deletionService;
    constructor(deletionService: AccountDeletionService);
    sendOtp(body: {
        phone: string;
    }): Promise<{
        message: string;
    }>;
    confirm(body: {
        phone: string;
        otp: string;
    }): Promise<{
        status: "scheduled";
        scheduledDeletionAt: Date;
    } | {
        status: "blocked";
        code: string;
        message: any;
        details: any;
    }>;
}
