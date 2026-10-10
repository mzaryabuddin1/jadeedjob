import { Injectable } from '@nestjs/common';

/** Dev OTPs — different per channel until production SMS/email is enabled */
export const DEV_PHONE_OTP = '123456';
export const DEV_EMAIL_OTP = '654321';

/** @deprecated use DEV_PHONE_OTP — kept for older call sites */
export const DEV_OTP_CODE = DEV_PHONE_OTP;

export type OtpChannel = 'phone' | 'email';

@Injectable()
export class OtpService {
  private otps = new Map<
    string,
    {
      code: string;
      used: boolean;
      expiresAt: Date;
      registrationData: any;
      channel: OtpChannel;
    }
  >();

  /**
   * @param key phone or email (unique identifier for this OTP session)
   * @param channel phone vs email — uses different codes so both must be proven
   */
  generateOTP(
    key: string,
    registrationData: any,
    channel: OtpChannel = key.includes('@') ? 'email' : 'phone',
  ): string {
    const otp = channel === 'email' ? DEV_EMAIL_OTP : DEV_PHONE_OTP;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.otps.set(key, {
      code: otp,
      used: false,
      expiresAt,
      registrationData,
      channel,
    });

    console.log(`OTP (${channel}) for ${key}: ${otp}`);
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
