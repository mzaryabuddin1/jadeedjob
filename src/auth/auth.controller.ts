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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}


  @Post('send-otp')
  @UsePipes(new JoiValidationPipe(
    Joi.object({
      phone: Joi.string().required(),
      countryId: Joi.string().required(),
    })
  ))
  async sendOtp(@Body() body:any) {
    const { phone } = body;
    return { message: this.otpService.generateOTP(phone) };
  }

  @Post('register')
  @UsePipes(new JoiValidationPipe(
    Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().required(),
      countryId: Joi.string().required(),
      languageId: Joi.string().required(),
      email: Joi.string().email().optional(),
      code: Joi.string().required(),
      password: Joi.string()
        .min(6)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
        .message(
          'Password must include uppercase, lowercase, number, and special character',
        )
        .required(),
    })
  ))
  async verifyOtp(@Body() dto:any) {
    const { phone, code, ...rest } = dto;

    const isValid = this.otpService.verifyOTP(phone, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.authService.createOrGetUser({
      phone,
      ...rest,
      isVerified: true,
    });

    const token = this.authService.generateToken(user);

    return { access_token: token, user };
  }
}
