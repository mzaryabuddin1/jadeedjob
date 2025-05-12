import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
  private otps = new Map<string, { code: string; used: boolean }>();

  generateOTP(phone: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otps.set(phone, { code: otp, used: false });
    console.log(`OTP for ${phone}: ${otp}`); // Replace with SMS logic
    return otp;
  }

  verifyOTP(phone: string, code: string): boolean {
    const otpEntry = this.otps.get(phone);
    if (!otpEntry || otpEntry.code !== code || otpEntry.used) return false;

    otpEntry.used = true;
    return true;
  }

  isOtpUsed(phone: string): boolean {
    const otpEntry = this.otps.get(phone);
    return !!otpEntry?.used;
  }
}
