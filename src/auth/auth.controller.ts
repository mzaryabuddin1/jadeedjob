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

const relationIdSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/),
);

const optionalString = () => Joi.string().allow('', null).optional();

const getRelationId = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return undefined;

  return id;
};

const isRelationIdLike = (value: unknown) => getRelationId(value) !== undefined;

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
        lastName: optionalString(),
        phone: Joi.string().required(),
        countryId: relationIdSchema.optional(),
        languageId: relationIdSchema.optional(),
        country: Joi.alternatives()
          .try(relationIdSchema, Joi.string().allow('', null))
          .optional(),
        language: relationIdSchema.optional(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .required(),

        email: Joi.string().email().optional(),
        full_name: Joi.string().optional(),
        photoUri: optionalString(),
        city: optionalString(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
      }),
    ),
  )
  async sendOtp(@Body() body: any) {
    const existing = await this.authService.findUserByPhone(body.phone);
    if (existing) throw new BadRequestException('Phone already registered');

    const countryId = getRelationId(body.countryId ?? body.country);
    const languageId = getRelationId(body.languageId ?? body.language);

    if (!countryId) {
      throw new BadRequestException('countryId must be a valid ID');
    }

    if (!languageId) {
      throw new BadRequestException('languageId must be a valid ID');
    }

    await this.authService.validateRegistrationRelations(countryId, languageId);

    const countryDisplay =
      typeof body.country === 'string' && !isRelationIdLike(body.country)
        ? body.country
        : undefined;

    const { salt, hash } = this.authService.hashPassword(body.password);
    const registrationData = {
      ...body,
      lastName: body.lastName || '',
      country: countryId,
      language: languageId,
      profile_photo: body.photoUri || undefined,
      contact_country: countryDisplay,
      passwordHash: hash,
      passwordSalt: salt,
    };

    delete registrationData.countryId;
    delete registrationData.languageId;
    delete registrationData.photoUri;
    delete registrationData.password;

    const otp = this.otpService.generateOTP(body.phone, registrationData);

    return { message: `OTP sent to ${body.phone}`, otp };
  }

  // ────────────────────────────────────────────────
  // VERIFY OTP (REGISTER)
  // ────────────────────────────────────────────────
  @Post('register/verify-otp')
  async verifyOtp(@Body() body: any) {
    const { phone, otp, code, fcmToken = null } = body;
    const submittedOtp = otp ?? code;

    const entry = this.otpService.getOtpEntry(phone);
    if (!entry) throw new UnauthorizedException('OTP not found');
    if (entry.used) throw new UnauthorizedException('OTP already used');
    if (entry.code !== submittedOtp)
      throw new UnauthorizedException('Invalid OTP');
    if (new Date() > entry.expiresAt) {
      this.otpService.deleteOtp(phone);
      throw new UnauthorizedException('OTP expired');
    }

    this.otpService.markUsed(phone);

    const user = (await this.authService.createOrGetUser({
      ...entry.registrationData,
      isVerified: true,
    })) as any;

    // 👉 Save FCM token if present
    if (fcmToken) {
      await this.authService.attachFcmToken(user.id, fcmToken);
    }

    const token = this.authService.generateToken(user);
    this.otpService.deleteOtp(phone);

    return {
      access_token: token,
      user: this.authService.toPublicUser(user),
    };
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
  async login(
    @Body() dto: { phone: string; password: string; fcmToken?: string },
  ) {
    const user = await this.authService.validateUser(dto.phone, dto.password);

    // create a safe copy for response (don't mutate entity)
    const publicUser = this.authService.toPublicUser(user);

    // 🔥 attach FCM token + subscribe to filter topics (if provided)
    if (dto.fcmToken) {
      await this.authService.attachFcmToken(user.id, dto.fcmToken);
    }

    const token = this.authService.generateToken(user);

    return {
      access_token: token,
      user: publicUser,
    };
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
