import { Injectable } from '@nestjs/common';

/** Dev OTP — always 123456 until production SMS/email is enabled */
export const DEV_OTP_CODE = '123456';

@Injectable()
export class OtpService {
  private otps = new Map<
    string,
    {
      code: string;
      used: boolean;
      expiresAt: Date;
      registrationData: any;
    }
  >();

  /**
   * @param key phone or email (unique identifier for this OTP session)
   */
  generateOTP(key: string, registrationData: any): string {
    const otp = DEV_OTP_CODE;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.otps.set(key, {
      code: otp,
      used: false,
      expiresAt,
      registrationData,
    });

    console.log(`OTP for ${key}: ${otp}`);
    return otp;
  }

  verifyOTP(key: string, code: string): boolean {
    const otpEntry = this.otps.get(key);
    if (!otpEntry || otpEntry.code !== code || otpEntry.used) return false;

    otpEntry.used = true;
    return true;
  }

  isOtpUsed(key: string): boolean {
    const otpEntry = this.otps.get(key);
    return !!otpEntry?.used;
  }

  getOtpEntry(key: string) {
    return this.otps.get(key);
  }

  markUsed(key: string) {
    const entry = this.otps.get(key);
    if (entry) {
      entry.used = true;
    }
  }

  deleteOtp(key: string) {
    this.otps.delete(key);
  }
}
