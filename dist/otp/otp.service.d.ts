export declare const DEV_OTP_CODE = "123456";
export declare class OtpService {
    private otps;
    generateOTP(key: string, registrationData: any): string;
    verifyOTP(key: string, code: string): boolean;
    isOtpUsed(key: string): boolean;
    getOtpEntry(key: string): {
        code: string;
        used: boolean;
        expiresAt: Date;
        registrationData: any;
    };
    markUsed(key: string): void;
    deleteOtp(key: string): void;
}
