import { Injectable } from '@nestjs/common';

@Injectable()
export class OtpService {
    private otps = new Map<string, string>(); // key: phone, value: otp
  
    generateOTP(phone: string): string {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.otps.set(phone, otp);
      console.log(`OTP for ${phone}: ${otp}`); // Replace with SMS send
      return otp;
    }
  
    verifyOTP(phone: string, code: string): boolean {
      return this.otps.get(phone) === code;
    }
  }
