export declare const DEV_PHONE_OTP = "123456";
export declare const DEV_EMAIL_OTP = "654321";
export declare const DEV_OTP_CODE = "123456";
export type OtpChannel = 'phone' | 'email';
export declare class OtpService {
    private otps;
    generateOTP(key: string, registrationData: any, channel?: OtpChannel): string;
    verifyOTP(key: string, code: string): boolean;
    isOtpUsed(key: string): boolean;
    getOtpEntry(key: string): {
        code: string;
        used: boolean;
        expiresAt: Date;
        registrationData: any;
        channel: OtpChannel;
    };
    markUsed(key: string): void;
    deleteOtp(key: string): void;
}
