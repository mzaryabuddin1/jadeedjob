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

    // ✅ 1. Check if user already registered
    const existingUser = await this.authService.findUserByPhone(phone);
    if (existingUser) {
      throw new BadRequestException('Phone number is already registered');
    }

    // ✅ 2. Check if OTP has already been used (example logic)
    const isUsed = this.otpService.isOtpUsed(phone);
    if (isUsed) {
      throw new BadRequestException('OTP has already been used');
    }

    // ✅ 3. Generate and send OTP
    const otp = this.otpService.generateOTP(phone);
    return { message: `OTP sent to ${phone}`, otp }; // remove OTP in prod
  }

  @Post('register')
  @UsePipes(new JoiValidationPipe(
    Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().required(),
      countryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      languageId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
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
    const { phone, code, password, ...rest } = dto;

    const isValid = this.otpService.verifyOTP(phone, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const { salt, hash } = this.authService.hashPassword(password)
    rest.passwordHash = hash
    rest.passwordSalt = salt

    const user = (await this.authService.createOrGetUser({
      phone,
      ...rest,
      isVerified: true,
    })).toObject();
    delete user.passwordHash
    delete user.passwordSalt

    const token = this.authService.generateToken(user);

    return { access_token: token, user };
  }

  @Post('login')
  @UsePipes(new JoiValidationPipe(
    Joi.object({
      phone: Joi.string().required(),
      password: Joi.string()
        .min(6)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
        .message('Password must include uppercase, lowercase, number, and special character')
        .required(),
    })
  ))
  async login(@Body() dto: any) {
    const { phone, password } = dto;
  
    const user = (await this.authService.validateUser(phone, password)).toObject();
    delete user.passwordHash
    delete user.passwordSalt
  
    const token = this.authService.generateToken(user);
  
    return { access_token: token, user };
  }


}
