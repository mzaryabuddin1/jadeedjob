import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { Request } from 'express';
import { Response } from 'express';
import { AuthSessionService } from './auth-session.service';
import { SocialAuthService } from './social-auth.service';
import { LegalService } from 'src/legal/legal.service';
export declare class AuthController {
    private readonly authService;
    private readonly otpService;
    private readonly twilioService;
    private readonly usersService;
    private readonly authSessionService;
    private readonly socialAuthService;
    private readonly legalService;
    constructor(authService: AuthService, otpService: OtpService, twilioService: TwilioService, usersService: UsersService, authSessionService: AuthSessionService, socialAuthService: SocialAuthService, legalService: LegalService);
    private deviceFrom;
    private sessionResponse;
    private deliverOtp;
    sendOtp(body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifyOtp(body: any): Promise<any>;
    login(dto: {
        phone: string;
        password: string;
        fcmToken?: string;
    }): Promise<any>;
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
    verifyPasswordChangeOtp(req: Request, body: any): Promise<any>;
    refresh(body: any): Promise<any>;
    logout(req: Request): Promise<{
        message: string;
    }>;
    logoutAll(req: Request): Promise<{
        message: string;
    }>;
    google(body: any, response: Response): Promise<any>;
    facebook(body: any, response: Response): Promise<any>;
    sendSocialPhoneOtp(body: any): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    verifySocialPhoneOtp(body: any): Promise<any>;
    private finishSocialLogin;
}
