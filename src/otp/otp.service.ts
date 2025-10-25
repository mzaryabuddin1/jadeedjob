import { Injectable } from '@nestjs/common';

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

  generateOTP(phone: string, registrationData: any): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.otps.set(phone, {
      code: otp,
      used: false,
      expiresAt,
      registrationData,
    });

    console.log({
      code: otp,
      used: false,
      expiresAt,
      registrationData,
    })

    console.log(`OTP for ${phone}: ${otp}`);
    return otp;
  }

  verifyOTP(phone: string, code: string): boolean {
    const otpEntry = this.otps.get(phone);
    console.log(this.otps)
    if (!otpEntry || otpEntry.code !== code || otpEntry.used) return false;

    otpEntry.used = true;
    return true;
  }

  isOtpUsed(phone: string): boolean {
    const otpEntry = this.otps.get(phone);
    return !!otpEntry?.used;
  }

  getOtpEntry(phone: string) {
    return this.otps.get(phone);
  }

  markUsed(phone: string) {
    const entry = this.otps.get(phone);
    if (entry) {
      entry.used = true;
    }
  }

  deleteOtp(phone: string) {
    this.otps.delete(phone);
  }

 
}
