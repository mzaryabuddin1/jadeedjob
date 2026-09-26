import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UsePipes,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from 'src/otp/otp.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
  ) {}

  private assertValidOtp(key: string, code: string, purpose?: string) {
    const entry = this.otpService.getOtpEntry(key);
    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.used) throw new UnauthorizedException('OTP already used');
    if (entry.code !== code) throw new UnauthorizedException('Invalid OTP');
    if (new Date() > entry.expiresAt) {
      this.otpService.deleteOtp(key);
      throw new UnauthorizedException('OTP expired');
    }
    if (purpose && entry.registrationData?.purpose !== purpose) {
      throw new UnauthorizedException('Invalid OTP purpose');
    }
    return entry;
  }

  @Post('register/send-otp')
  @ApiOperation({
    summary: 'Register — send OTP to phone',
    description:
      'Phone required. Email & city optional. Dev OTP is always **123456**.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'firstName',
        'lastName',
        'phone',
        'country',
        'language',
        'password',
      ],
      properties: {
        firstName: { type: 'string', example: 'Ali' },
        lastName: { type: 'string', example: 'Khan' },
        phone: { type: 'string', example: '+923001234567' },
        country: { type: 'number', example: 41, description: 'Country id' },
        language: { type: 'number', example: 2, description: 'Language id' },
        city: {
          type: 'number',
          example: 1,
          description: 'Optional city id',
        },
        password: {
          type: 'string',
          example: 'Pass@123',
          description:
            'Min 6 chars; upper, lower, number, special character required',
        },
        email: {
          type: 'string',
          example: 'ali@example.com',
          description: 'Optional, must be unique',
        },
        full_name: { type: 'string', example: 'Ali Khan' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phone: Joi.string().required(),
        country: Joi.number().required(),
        language: Joi.number().required(),
        city: Joi.number().optional(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .required(),
        email: Joi.string().email().optional().allow(null, ''),
        full_name: Joi.string().optional(),
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const existing = await this.authService.findUserByPhone(body.phone);
    if (existing) throw new BadRequestException('Phone already registered');

    if (body.email) {
      await this.authService.assertEmailAvailable(body.email);
    } else {
      delete body.email;
    }

    const { salt, hash } = this.authService.hashPassword(body.password);
    body.passwordHash = hash;
    body.passwordSalt = salt;
    delete body.password;

    const otp = this.otpService.generateOTP(body.phone, {
      ...body,
      purpose: 'register',
    });

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  @Post('register/verify-otp')
  @ApiOperation({ summary: 'Register — verify OTP & create account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        code: { type: 'string', example: '123456' },
        fcmToken: { type: 'string', example: 'optional-fcm-token' },
      },
    },
  })
  async verifyOtp(@Body() body: any) {
    const { phone, code, fcmToken = null } = body;

    const entry = this.assertValidOtp(phone, code, 'register');
    this.otpService.markUsed(phone);

    const user = (await this.authService.createOrGetUser({
      ...entry.registrationData,
      isVerified: true,
    })) as User;

    if (fcmToken) {
      await this.authService.attachFcmToken(user.id, fcmToken);
    }

    this.otpService.deleteOtp(phone);

    const fresh = (await this.authService.findUserById(user.id))!;
    return this.authService.authResponse(fresh);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone & password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'password'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        password: { type: 'string', example: 'Pass@123' },
        fcmToken: { type: 'string' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional(),
      }),
    ),
  )
  async login(
    @Body() dto: { phone: string; password: string; fcmToken?: string },
  ) {
    const user = await this.authService.validateUser(dto.phone, dto.password);

    if (dto.fcmToken) {
      await this.authService.attachFcmToken(user.id, dto.fcmToken);
    }

    const fresh = (await this.authService.findUserById(user.id))!;
    return this.authService.authResponse(fresh);
  }

  @Post('google')
  @ApiOperation({
    summary: 'Google login / signup',
    description: 'Returns `kyc_complete`. If false, complete KYC via /auth/kyc/*',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idToken'],
      properties: {
        idToken: { type: 'string', example: '<Google Sign-In ID token>' },
        fcmToken: { type: 'string' },
        country: { type: 'number', example: 41 },
        language: { type: 'number', example: 2 },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        idToken: Joi.string().required(),
        fcmToken: Joi.string().optional(),
        country: Joi.number().optional(),
        language: Joi.number().optional(),
      }),
    ),
  )
  async googleAuth(
    @Body()
    body: {
      idToken: string;
      fcmToken?: string;
      country?: number;
      language?: number;
    },
  ) {
    return this.authService.loginWithGoogle(body.idToken, {
      fcmToken: body.fcmToken,
      country: body.country,
      language: body.language,
    });
  }

  @Post('facebook')
  @ApiOperation({
    summary: 'Facebook login / signup',
    description: 'Returns `kyc_complete`. If false, complete KYC via /auth/kyc/*',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: {
          type: 'string',
          example: '<Facebook Login access token>',
        },
        fcmToken: { type: 'string' },
        country: { type: 'number', example: 41 },
        language: { type: 'number', example: 2 },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        accessToken: Joi.string().required(),
        fcmToken: Joi.string().optional(),
        country: Joi.number().optional(),
        language: Joi.number().optional(),
      }),
    ),
  )
  async facebookAuth(
    @Body()
    body: {
      accessToken: string;
      fcmToken?: string;
      country?: number;
      language?: number;
    },
  ) {
    return this.authService.loginWithFacebook(body.accessToken, {
      fcmToken: body.fcmToken,
      country: body.country,
      language: body.language,
    });
  }

  @Post('update-email/send-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Update email — send OTP',
    description: 'JWT required. Email must be unique. Dev OTP = 123456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'newemail@example.com' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().required(),
      }),
    ),
  )
  async sendUpdateEmailOtp(@Req() req: any, @Body() body: { email: string }) {
    const userId = req.user.id;
    await this.authService.assertEmailAvailable(body.email, userId);

    const otp = this.otpService.generateOTP(body.email, {
      purpose: 'update-email',
      email: body.email,
      userId,
    });

    return { message: `OTP sent to ${body.email}`, otp };
  }

  @Post('update-email/verify-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update email — verify OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'code'],
      properties: {
        email: { type: 'string', example: 'newemail@example.com' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().required(),
        code: Joi.string().required(),
      }),
    ),
  )
  async verifyUpdateEmailOtp(
    @Req() req: any,
    @Body() body: { email: string; code: string },
  ) {
    const userId = req.user.id;
    const entry = this.assertValidOtp(body.email, body.code, 'update-email');

    if (entry.registrationData?.userId !== userId) {
      throw new UnauthorizedException('OTP does not belong to this user');
    }

    this.otpService.markUsed(body.email);
    const user = await this.authService.updateUserEmail(userId, body.email);
    this.otpService.deleteOtp(body.email);

    return {
      message: 'Email updated successfully',
      kyc_complete: this.authService.isKycComplete(user),
      user: this.authService.toPublicUser(user),
    };
  }

  @Post('kyc/send-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'KYC — send OTP to phone (Google/Facebook users)',
    description: 'JWT required. Dev OTP = 123456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        country: { type: 'number', example: 41 },
        language: { type: 'number', example: 2 },
        city: { type: 'number', example: 1 },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        country: Joi.number().optional(),
        language: Joi.number().optional(),
        city: Joi.number().optional(),
      }),
    ),
  )
  async sendKycOtp(
    @Req() req: any,
    @Body()
    body: {
      phone: string;
      country?: number;
      language?: number;
      city?: number;
    },
  ) {
    const userId = req.user.id;
    const phoneTaken = await this.authService.findUserByPhone(body.phone);
    if (phoneTaken && phoneTaken.id !== userId) {
      throw new BadRequestException('Phone already registered');
    }

    const otp = this.otpService.generateOTP(body.phone, {
      purpose: 'kyc',
      userId,
      phone: body.phone,
      country: body.country,
      language: body.language,
      city: body.city,
    });

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  @Post('kyc/verify-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'KYC — verify phone OTP',
    description: 'Sets kyc_complete = true',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        code: Joi.string().required(),
      }),
    ),
  )
  async verifyKycOtp(
    @Req() req: any,
    @Body() body: { phone: string; code: string },
  ) {
    const userId = req.user.id;
    const entry = this.assertValidOtp(body.phone, body.code, 'kyc');

    if (entry.registrationData?.userId !== userId) {
      throw new UnauthorizedException('OTP does not belong to this user');
    }

    this.otpService.markUsed(body.phone);

    const user = await this.authService.completeKyc(userId, {
      phone: body.phone,
      country: entry.registrationData.country,
      language: entry.registrationData.language,
      city: entry.registrationData.city,
    });

    this.otpService.deleteOtp(body.phone);

    return {
      message: 'KYC completed successfully',
      kyc_complete: true,
      user: this.authService.toPublicUser(user),
    };
  }

  @Post('forgot-password/send-otp')
  @ApiOperation({ summary: 'Forgot password — send OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
      },
    },
  })
  async sendForgotPasswordOtp(@Body() body: any) {
    const user = await this.authService.findUserByPhone(body.phone);
    if (!user) throw new BadRequestException('Phone not registered');

    const otp = this.otpService.generateOTP(body.phone, {
      phone: body.phone,
      purpose: 'forgot-password',
    });

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  @Post('forgot-password/verify-otp')
  @ApiOperation({ summary: 'Forgot password — verify OTP & reset' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code', 'newPassword'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        code: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: 'NewPass@123' },
      },
    },
  })
  async verifyForgotPasswordOtp(@Body() body: any) {
    const { phone, code, newPassword } = body;

    this.assertValidOtp(phone, code, 'forgot-password');

    const user = await this.authService.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');

    const { salt, hash } = this.authService.hashPassword(newPassword);
    await this.authService.resetPassword(phone, salt, hash);

    this.otpService.markUsed(phone);
    this.otpService.deleteOtp(phone);

    return { message: 'Password reset successfully' };
  }
}
