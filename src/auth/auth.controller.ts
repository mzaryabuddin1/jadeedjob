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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly twilioService: TwilioService,
  ) {}

  @Post('register/send-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phone: Joi.string().required(),
        countryId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
        languageId: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
        email: Joi.string().email().optional(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .required(),
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const { phone } = body;

    const existingUser = await this.authService.findUserByPhone(phone);
    if (existingUser) {
      throw new BadRequestException('Phone number is already registered');
    }

    const { salt, hash } = this.authService.hashPassword(body.password);
    body.passwordHash = hash;
    body.passwordSalt = salt;
    delete body.password;

    const otp = this.otpService.generateOTP(phone, body);
    this.twilioService.sendSms(
      phone,
      otp + ' code will be expire in 5 minutes.',
    );
    return { message: `OTP sent to ${phone}`, otp }; // remove OTP in prod
  }

  @Post('register/verify-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        code: Joi.string().length(6).required(),
      }),
    ),
  )
  async verifyOtp(@Body() body: any) {
    const { phone, code } = body;
    const entry = this.otpService.getOtpEntry(phone);

    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.used) throw new UnauthorizedException('OTP already used');
    if (new Date() > entry.expiresAt) {
      this.otpService.deleteOtp(phone);
      throw new UnauthorizedException('OTP expired');
    }
    if (entry.code !== code) throw new UnauthorizedException('Invalid OTP');

    // ✅ Mark used and extract data
    this.otpService.markUsed(phone);
    const { registrationData } = entry;

    const user = (
      await this.authService.createOrGetUser({
        ...registrationData,
        isVerified: true,
      })
    ).toObject();

    delete user.passwordHash;
    delete user.passwordSalt;

    const token = this.authService.generateToken(user);
    this.otpService.deleteOtp(phone); // Optional cleanup

    return { access_token: token, user };
  }

  @Post('login')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .required(),
      }),
    ),
  )
  async login(@Body() dto: any) {
    const { phone, password } = dto;

    const user = (
      await this.authService.validateUser(phone, password)
    ).toObject();
    delete user.passwordHash;
    delete user.passwordSalt;

    const token = this.authService.generateToken(user);

    return { access_token: token, user };
  }

  @Post('forgot-password/send-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
      }),
    ),
  )
  async sendForgotPasswordOtp(@Body() body: any) {
    const { phone } = body;

    const user = await this.authService.findUserByPhone(phone);
    if (!user) {
      throw new BadRequestException('Phone number is not registered');
    }

    const otp = this.otpService.generateOTP(phone, {
      phone,
      purpose: 'forgot-password',
    });
    await this.twilioService.sendSms(
      phone,
      `${otp} is your OTP to reset password. It will expire in 5 minutes.`,
    );

    return { message: `OTP sent to ${phone}`, otp };
  }

  @Post('forgot-password/verify-otp')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        code: Joi.string().length(6).required(),
        newPassword: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .required(),
      }),
    ),
  )
  async verifyForgotPasswordOtp(@Body() body: any) {
    const { phone, code, newPassword } = body;

    const entry = this.otpService.getOtpEntry(phone);

    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.used) throw new UnauthorizedException('OTP already used');
    if (new Date() > entry.expiresAt) {
      this.otpService.deleteOtp(phone);
      throw new UnauthorizedException('OTP expired');
    }
    if (entry.code !== code) throw new UnauthorizedException('Invalid OTP');
    if (entry.registrationData?.purpose !== 'forgot-password') {
      throw new UnauthorizedException('OTP is not for password reset');
    }

    const user = await this.authService.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');

    const { salt, hash } = this.authService.hashPassword(newPassword);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    await user.save();

    this.otpService.markUsed(phone);
    this.otpService.deleteOtp(phone);

    return { message: 'Password has been reset successfully' };
  }
}
