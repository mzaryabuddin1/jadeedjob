import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    private readonly otpService;
    private readonly twilioService;
    private readonly usersService;
    constructor(authService: AuthService, otpService: OtpService, twilioService: TwilioService, usersService: UsersService);
    sendOtp(body: any): Promise<{
        message: string;
        otp: string;
    }>;
    verifyOtp(body: any): Promise<{
        access_token: string;
        user: User;
    }>;
    login(dto: {
        phone: string;
        password: string;
        fcmToken?: string;
    }): Promise<{
        access_token: string;
        user: any;
    }>;
    sendForgotPasswordOtp(body: any): Promise<{
        message: string;
        otp: string;
    }>;
    verifyForgotPasswordOtp(body: any): Promise<{
        message: string;
    }>;
}
