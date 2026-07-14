import { Repository } from 'typeorm';
import { OtpPurpose, OtpRecord } from './entities/otp-record.entity';
type CreateOtpInput = {
    purpose: OtpPurpose;
    target: string;
    userId?: number | null;
    metadata?: Record<string, any>;
};
type VerifyOtpInput = {
    purpose: OtpPurpose;
    target: string;
    otp: string;
    userId?: number | null;
};
export declare class OtpService {
    private readonly otpRepo;
    private readonly maxAttempts;
    constructor(otpRepo: Repository<OtpRecord>);
    private hashOtp;
    private normalizeUserId;
    private activeOtpQuery;
    private generateCode;
    createOtp(input: CreateOtpInput): Promise<{
        otp: string;
        record: OtpRecord;
    }>;
    verifyOtp(input: VerifyOtpInput): Promise<OtpRecord>;
    shouldExposeOtp(): boolean;
    otpResponse(message: string, otp: string): {
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    };
}
export {};
