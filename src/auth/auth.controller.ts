import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { UsersService } from 'src/users/users.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
  ) {}

  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto) {
    const { phone, countryId } = body;
    return { message: this.otpService.generateOTP(phone) };
  }

  @Post('register')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
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
