import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { TwilioService } from 'src/twilio/twilio.service';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly twilioService: TwilioService,
    private readonly usersService: UsersService,
  ) {}

  // ────────────────────────────────────────────────
  // SEND OTP FOR REGISTRATION
  // ────────────────────────────────────────────────
  @Post('register/send-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phone: Joi.string().required(),
        country: Joi.number().required(),
        language: Joi.number().required(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .required(),

        email: Joi.string().email().optional(),
        full_name: Joi.string().optional(),
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const existing = await this.authService.findUserByPhone(body.phone);
    if (existing) throw new BadRequestException('Phone already registered');

    const { salt, hash } = this.authService.hashPassword(body.password);
    body.passwordHash = hash;
    body.passwordSalt = salt;
    delete body.password;

    const otp = this.otpService.generateOTP(body.phone, body);

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP (REGISTER)
  // ────────────────────────────────────────────────
  @Post('register/verify-otp')
  async verifyOtp(@Body() body: any) {
    const { phone, code, fcmToken = null } = body;

    const entry = this.otpService.getOtpEntry(phone);
    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.used) throw new UnauthorizedException('OTP already used');
    if (entry.code !== code) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > entry.expiresAt) {
      this.otpService.deleteOtp(phone);
      throw new UnauthorizedException('OTP expired');
    }

    this.otpService.markUsed(phone);

    const user = await this.authService.createOrGetUser({
      ...entry.registrationData,
      isVerified: true,
    }) as User;

    // 👉 Save FCM token if present
  if (fcmToken) {
    await this.usersService.updateUser(user.id, {
      fcmToken,
    });
  }

    const token = this.authService.generateToken(user);
    this.otpService.deleteOtp(phone);


    return { access_token: token, user };
  }



  // ────────────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────────────
  @Post('login')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional(),
      }),
    ),
  )
  async login(@Body() dto: any) {
    const user = await this.authService.validateUser(dto.phone, dto.password);
    delete user.passwordHash;
    delete user.passwordSalt;

    const token = this.authService.generateToken(user);

    const { fcmToken = null } = dto;
    await this.usersService.updateUser(user.id, {"fcmToken":fcmToken});

    return { access_token: token, user };
  }

  // ────────────────────────────────────────────────
  // SEND OTP FOR FORGOT PASSWORD
  // ────────────────────────────────────────────────
  @Post('forgot-password/send-otp')
  async sendForgotPasswordOtp(@Body() body: any) {
    const user = await this.authService.findUserByPhone(body.phone);
    if (!user) throw new BadRequestException('Phone not registered');

    const otp = this.otpService.generateOTP(body.phone, {
      phone: body.phone,
      purpose: 'forgot-password',
    });

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP & RESET PASSWORD
  // ────────────────────────────────────────────────
  @Post('forgot-password/verify-otp')
  async verifyForgotPasswordOtp(@Body() body: any) {
    const { phone, code, newPassword } = body;

    const entry = this.otpService.getOtpEntry(phone);

    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.code !== code) throw new UnauthorizedException('Invalid OTP');
    if (entry.registrationData?.purpose !== 'forgot-password')
      throw new UnauthorizedException('Invalid OTP purpose');
    if (new Date() > entry.expiresAt)
      throw new UnauthorizedException('OTP expired');

    const user = await this.authService.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');

    const { salt, hash } = this.authService.hashPassword(newPassword);
    await this.authService.resetPassword(phone, salt, hash);

    this.otpService.markUsed(phone);
    this.otpService.deleteOtp(phone);

    return { message: 'Password reset successfully' };
  }
}
