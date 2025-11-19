export declare class OtpService {
    private otps;
    generateOTP(phone: string, registrationData: any): string;
    verifyOTP(phone: string, code: string): boolean;
    isOtpUsed(phone: string): boolean;
    getOtpEntry(phone: string): {
        code: string;
        used: boolean;
        expiresAt: Date;
        registrationData: any;
    };
    markUsed(phone: string): void;
    deleteOtp(phone: string): void;
}
