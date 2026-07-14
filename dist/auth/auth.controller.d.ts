import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { Request } from 'express';
export declare class AuthController {
    private readonly authService;
    private readonly otpService;
    private readonly twilioService;
    private readonly usersService;
    constructor(authService: AuthService, otpService: OtpService, twilioService: TwilioService, usersService: UsersService);
    private deliverOtp;
    sendOtp(body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifyOtp(body: any): Promise<{
        user: any;
        verificationRequirements: import("../users/profile-verification.util").VerificationRequirements;
        access_token: string;
    }>;
    login(dto: {
        phone: string;
        password: string;
        fcmToken?: string;
    }): Promise<{
        user: any;
        verificationRequirements: import("../users/profile-verification.util").VerificationRequirements;
        access_token: string;
    }>;
    sendForgotPasswordOtp(body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifyForgotPasswordOtp(body: any): Promise<{
        message: string;
    }>;
    sendPhoneChangeOtp(req: Request, body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifyPhoneChangeOtp(req: Request, body: any): Promise<{
        user: any;
        verificationRequirements: import("../users/profile-verification.util").VerificationRequirements;
        message: string;
    }>;
    sendPasswordChangeOtp(req: Request, body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifyPasswordChangeOtp(req: Request, body: any): Promise<{
        user: any;
        verificationRequirements: import("../users/profile-verification.util").VerificationRequirements;
        message: string;
        access_token: string;
    }>;
}
