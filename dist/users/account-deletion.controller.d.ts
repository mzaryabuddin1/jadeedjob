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
