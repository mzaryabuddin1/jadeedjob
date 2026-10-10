import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UnauthorizedException,
  UsePipes,
  BadRequestException,
  UseGuards,
  Req,
  ForbiddenException,
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
    summary: 'Register — send OTP to phone (and email if provided)',
    description:
      'Phone + `terms_and_condition: true` required. If optional email is set, a **different** OTP is sent to email. Dev: phone=`123456`, email=`654321`.',
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
        'terms_and_condition',
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
          description: 'Optional — if set, OTP is also sent to this email',
        },
        terms_and_condition: {
          type: 'boolean',
          example: true,
          description: 'Must be true',
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
        terms_and_condition: Joi.boolean().valid(true).required().messages({
          'any.only': 'terms_and_condition must be true',
        }),
        full_name: Joi.string().optional(),
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const existing = await this.authService.findUserByPhone(body.phone);
    if (existing) throw new BadRequestException('Phone already registered');

    if (body.email) {
      body.email = String(body.email).trim().toLowerCase();
      await this.authService.assertEmailAvailable(body.email);
    } else {
      delete body.email;
    }

    const { salt, hash } = this.authService.hashPassword(body.password);
    body.passwordHash = hash;
    body.passwordSalt = salt;
    delete body.password;

    const phoneOtp = this.otpService.generateOTP(
      body.phone,
      {
        ...body,
        purpose: 'register',
        emailPending: !!body.email,
      },
      'phone',
    );

    const channels = ['phone'];
    let emailOtp: string | undefined;
    if (body.email) {
      emailOtp = this.otpService.generateOTP(
        body.email,
        {
          purpose: 'register_email',
          phone: body.phone,
          email: body.email,
        },
        'email',
      );
      channels.push('email');
    }

    return {
      message:
        channels.length > 1
          ? `OTP sent to ${body.phone} and ${body.email}`
          : `OTP sent to ${body.phone}`,
      otp: phoneOtp,
      phone_otp: phoneOtp,
      ...(emailOtp ? { email_otp: emailOtp } : {}),
      otp_channels: channels,
      email_otp_required: !!body.email,
    };
  }

  @Post('register/verify-otp')
  @ApiOperation({
    summary: 'Register — verify OTP & create account',
    description:
      'If email was provided at send-otp, also send `emailCode` (different from phone OTP). Dev email OTP = **654321**.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        code: { type: 'string', example: '123456', description: 'Phone OTP' },
        emailCode: {
          type: 'string',
          example: '654321',
          description: 'Required if email OTP was sent — different from phone OTP',
        },
        fcmToken: { type: 'string', example: 'optional-fcm-token' },
      },
    },
  })
  async verifyOtp(@Body() body: any) {
    const { phone, code, emailCode, fcmToken = null } = body;

    const entry = this.assertValidOtp(phone, code, 'register');
    this.otpService.markUsed(phone);

    const regEmail = entry.registrationData?.email;
    if (regEmail) {
      if (!emailCode) {
        throw new BadRequestException(
          'emailCode is required — OTP was also sent to your email',
        );
      }
      this.assertValidOtp(regEmail, emailCode, 'register_email');
      this.otpService.markUsed(regEmail);
      this.otpService.deleteOtp(regEmail);
    }

    const user = (await this.authService.createOrGetUser({
      ...entry.registrationData,
      isVerified: true,
      terms_and_condition: true,
    })) as User;

    if (fcmToken) {
      await this.authService.attachFcmToken(user.id, fcmToken);
    }

    this.otpService.deleteOtp(phone);

    const fresh = (await this.authService.findUserById(user.id))!;
    return this.authService.authResponse(fresh);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login with phone or email & password',
    description: 'Send either `phone` or `email` (or both). Password required.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Pass@123' },
        fcmToken: { type: 'string' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().optional(),
        email: Joi.string().email().optional(),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional(),
      })
        .or('phone', 'email')
        .messages({
          'object.missing': 'Provide phone or email',
        }),
    ),
  )
  async login(
    @Body()
    dto: {
      phone?: string;
      email?: string;
      password: string;
      fcmToken?: string;
    },
  ) {
    const user = await this.authService.validateUser(
      { phone: dto.phone, email: dto.email },
      dto.password,
    );

    if (dto.fcmToken) {
      await this.authService.attachFcmToken(user.id, dto.fcmToken);
    }

    const fresh = (await this.authService.findUserById(user.id))!;
    return this.authService.authResponse(fresh);
  }

  @Post('google')
  @ApiOperation({
    summary: 'Google login / signup',
    description:
      'Existing user → `access_token`. New user → needs `terms_and_condition: true` → `kyc_token` (complete via `/auth/kyc/*`).',
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
        terms_and_condition: {
          type: 'boolean',
          example: true,
          description: 'Required true for new Google registration',
        },
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
        terms_and_condition: Joi.boolean().optional(),
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
      terms_and_condition?: boolean;
    },
  ) {
    return this.authService.loginWithGoogle(body.idToken, {
      fcmToken: body.fcmToken,
      country: body.country,
      language: body.language,
      terms_and_condition: body.terms_and_condition,
    });
  }

  @Post('facebook')
  @ApiOperation({
    summary: 'Facebook login / signup',
    description:
      'Existing user → `access_token`. New user → needs `terms_and_condition: true` → `kyc_token`.',
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
        terms_and_condition: {
          type: 'boolean',
          example: true,
          description: 'Required true for new Facebook registration',
        },
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
        terms_and_condition: Joi.boolean().optional(),
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
      terms_and_condition?: boolean;
    },
  ) {
    return this.authService.loginWithFacebook(body.accessToken, {
      fcmToken: body.fcmToken,
      country: body.country,
      language: body.language,
      terms_and_condition: body.terms_and_condition,
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
  @ApiOperation({
    summary: 'KYC / link — send OTP to phone',
    description:
      'Pass `kycToken` from Google/Facebook. Checks social-email conflicts before sending OTP. If phone already exists, OTP proves ownership for linking. Dev OTP = 123456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        kycToken: {
          type: 'string',
          description: 'From Google/Facebook when kyc_token is returned',
        },
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
        kycToken: Joi.string().optional(),
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
      kycToken?: string;
      country?: number;
      language?: number;
      city?: number;
    },
  ) {
    const phoneTaken = await this.authService.findUserByPhone(body.phone);

    if (body.kycToken) {
      const pending = this.authService.verifyKycToken(body.kycToken);

      // Fail early (same check as verify) — don't send OTP if email conflict
      await this.authService.assertSocialKycEmailOk(pending, body.phone);

      // Phone may already exist — OTP will authorize linking to that account
      const otp = this.otpService.generateOTP(body.phone, {
        purpose: 'kyc',
        mode: 'social_kyc',
        pending,
        phone: body.phone,
        country: body.country ?? pending.country,
        language: body.language ?? pending.language,
        city: body.city,
        phoneExists: !!phoneTaken,
      });

      return {
        message: phoneTaken
          ? `OTP sent to ${body.phone}. After verify, this social login will link to your existing account.`
          : `OTP sent to ${body.phone}`,
        otp,
        phone_exists: !!phoneTaken,
      };
    }

    const userId =
      this.authService.tryGetUserIdFromAuthHeader(
        req.headers?.authorization,
      ) ?? req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Provide kycToken (Google/Facebook) or Bearer access_token',
      );
    }

    if (phoneTaken && phoneTaken.id !== userId) {
      throw new BadRequestException('Phone already registered');
    }

    const otp = this.otpService.generateOTP(body.phone, {
      purpose: 'kyc',
      mode: 'attach_phone',
      userId,
      phone: body.phone,
      country: body.country,
      language: body.language,
      city: body.city,
    });

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  @Post('kyc/verify-otp')
  @ApiOperation({
    summary: 'KYC / link — verify phone OTP',
    description:
      'Creates a new account OR links social to existing phone account. If that account already has another Google/Facebook, returns `link_token` for confirmation (no overwrite).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code'],
      properties: {
        phone: { type: 'string', example: '+923001234567' },
        code: { type: 'string', example: '123456' },
        kycToken: { type: 'string' },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        phone: Joi.string().required(),
        code: Joi.string().required(),
        kycToken: Joi.string().optional(),
      }),
    ),
  )
  async verifyKycOtp(
    @Req() req: any,
    @Body() body: { phone: string; code: string; kycToken?: string },
  ) {
    const entry = this.assertValidOtp(body.phone, body.code, 'kyc');
    this.otpService.markUsed(body.phone);

    const mode = entry.registrationData?.mode;

    if (mode === 'social_kyc' || mode === 'create_from_social') {
      const pending =
        entry.registrationData.pending ||
        (body.kycToken
          ? this.authService.verifyKycToken(body.kycToken)
          : null);

      if (!pending) {
        throw new UnauthorizedException('Missing pending social signup data');
      }

      const result = await this.authService.resolveSocialKyc(pending, {
        phone: body.phone,
        country: entry.registrationData.country,
        language: entry.registrationData.language,
        city: entry.registrationData.city,
        fcmToken: pending.fcmToken,
      });

      this.otpService.deleteOtp(body.phone);

      if (result.status === 'needs_confirmation') {
        return {
          message: result.message,
          kyc_complete: this.authService.isKycComplete(result.user),
          requires_link_confirmation: true,
          link_token: result.link_token,
          existing_providers: result.existing_providers,
          // Phone ownership verified — allow session on existing account,
          // but social is NOT linked until /auth/link-identity/confirm
          ...this.authService.authResponse(result.user, { isNewUser: false }),
        };
      }

      return {
        message: result.isNewUser
          ? 'Account created successfully'
          : 'Social account linked successfully',
        ...this.authService.authResponse(result.user, {
          isNewUser: result.isNewUser,
        }),
      };
    }

    const userId =
      entry.registrationData?.userId ??
      this.authService.tryGetUserIdFromAuthHeader(
        req.headers?.authorization,
      ) ??
      req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Invalid KYC session');
    }

    if (
      entry.registrationData?.userId &&
      entry.registrationData.userId !== userId
    ) {
      throw new UnauthorizedException('OTP does not belong to this user');
    }

    const user = await this.authService.completeKyc(userId, {
      phone: body.phone,
      country: entry.registrationData.country,
      language: entry.registrationData.language,
      city: entry.registrationData.city,
    });

    this.otpService.deleteOtp(body.phone);

    return {
      message: 'KYC completed successfully',
      ...this.authService.authResponse(user, { isNewUser: false }),
    };
  }

  @Post('link-identity/confirm')
  @ApiOperation({
    summary: 'Confirm linking an additional Google/Facebook account',
    description:
      'Used when verify-otp returns `requires_link_confirmation`. Does not replace existing primary Google/Facebook or email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['linkToken', 'confirm'],
      properties: {
        linkToken: { type: 'string' },
        confirm: { type: 'boolean', example: true },
      },
    },
  })
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        linkToken: Joi.string().required(),
        confirm: Joi.boolean().required(),
      }),
    ),
  )
  async confirmLinkIdentity(
    @Body() body: { linkToken: string; confirm: boolean },
  ) {
    if (!body.confirm) {
      return {
        message:
          'Link cancelled. You can still login with phone or your previously linked social account.',
        linked: false,
      };
    }

    return this.authService.confirmLinkIdentity(body.linkToken);
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

  @Get('debug/accounts')
  @ApiOperation({
    summary: '[DEV] List users + social identities',
    description:
      'For google-login.html auth lab. Disabled when NODE_ENV=production.',
  })
  async debugAccounts() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    const accounts = await this.authService.listDebugAccounts();
    return {
      count: accounts.length,
      accounts,
      refreshedAt: new Date().toISOString(),
    };
  }

  @Delete('debug/accounts/:id')
  @ApiOperation({
    summary: '[DEV] Delete a user + identities',
    description: 'For auth lab cleanup. Disabled when NODE_ENV=production.',
  })
  async debugDeleteAccount(@Param('id', ParseIntPipe) id: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    return this.authService.deleteDebugAccount(id);
  }
}
