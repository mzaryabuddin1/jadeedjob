import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { TwilioService } from 'src/twilio/twilio.service';
export declare class AuthController {
    private readonly authService;
    private readonly otpService;
    private readonly twilioService;
    constructor(authService: AuthService, otpService: OtpService, twilioService: TwilioService);
    sendOtp(body: any): Promise<{
        message: string;
        otp: string;
    }>;
    verifyOtp(body: any): Promise<{
        access_token: string;
        user: import("../users/entities/user.entity").User | import("../users/entities/user.entity").User[];
    }>;
    login(dto: any): Promise<{
        access_token: string;
        user: import("../users/entities/user.entity").User;
    }>;
    sendForgotPasswordOtp(body: any): Promise<{
        message: string;
        otp: string;
    }>;
    verifyForgotPasswordOtp(body: any): Promise<{
        message: string;
    }>;
}
