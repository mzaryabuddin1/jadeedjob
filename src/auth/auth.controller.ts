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
        // ===== Required Fields =====
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phone: Joi.string().required(),
        country: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
        language: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .required(),

        // ===== Optional Fields =====
        email: Joi.string().email().optional(),
        isVerified: Joi.boolean().optional(),
        isBanned: Joi.boolean().optional(),

        // Basic Details
        full_name: Joi.string().optional(),
        father_name: Joi.string().optional(),
        gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
        date_of_birth: Joi.date().optional(),
        nationality: Joi.string().optional(),
        marital_status: Joi.string()
          .valid('Single', 'Married', 'Other')
          .optional(),
        profile_photo: Joi.string().uri().optional(),

        // Contact Info
        alternate_phone: Joi.string().optional(),
        address_line1: Joi.string().optional(),
        address_line2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        contact_country: Joi.string().optional(),

        // Identity Verification
        national_id_number: Joi.string().optional(),
        passport_number: Joi.string().optional(),
        id_expiry_date: Joi.date().optional(),
        id_document_front: Joi.string().uri().optional(),
        id_document_back: Joi.string().uri().optional(),
        address_proof_document: Joi.string().uri().optional(),

        // Professional Summary
        professional_summary: Joi.string().optional(),

        // ===== Subschemas =====

        // Work Experience (array)
        work_experience: Joi.array()
          .items(
            Joi.object({
              company_name: Joi.string().optional(),
              designation: Joi.string().optional(),
              department: Joi.string().optional(),
              employment_type: Joi.string()
                .valid('Full-time', 'Part-time', 'Contract')
                .optional(),
              from_date: Joi.date().optional(),
              to_date: Joi.date().optional(),
              key_responsibilities: Joi.string().optional(),
              experience_certificate: Joi.string().uri().optional(),
              currently_working: Joi.boolean().optional(),
            }),
          )
          .optional(),

        // Education (array)
        education: Joi.array()
          .items(
            Joi.object({
              highest_qualification: Joi.string().optional(),
              institution_name: Joi.string().optional(),
              graduation_year: Joi.string().optional(),
              gpa_or_grade: Joi.string().optional(),
              degree_document: Joi.string().uri().optional(),
            }),
          )
          .optional(),

        // Certifications (array)
        certifications: Joi.array()
          .items(
            Joi.object({
              certification_name: Joi.string().optional(),
              issuing_institution: Joi.string().optional(),
              certification_date: Joi.date().optional(),
              certificate_file: Joi.string().uri().optional(),
            }),
          )
          .optional(),

        // Skills
        skills: Joi.array().items(Joi.string()).optional(),
        technical_skills: Joi.array().items(Joi.string()).optional(),
        soft_skills: Joi.array().items(Joi.string()).optional(),

        // Social Links
        linkedin_url: Joi.string().uri().optional(),
        github_url: Joi.string().uri().optional(),
        portfolio_url: Joi.string().uri().optional(),
        behance_url: Joi.string().uri().optional(),

        // Bank Info
        bank_name: Joi.string().optional(),
        account_number: Joi.string().optional(),
        iban: Joi.string().optional(),
        branch_name: Joi.string().optional(),
        swift_code: Joi.string().optional(),

        // Verification
        kyc_status: Joi.string()
          .valid('pending', 'verified', 'rejected')
          .default('pending'),
        verified_by_admin_id: Joi.string()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .optional(),
        verification_date: Joi.date().optional(),
        rejection_reason: Joi.string().optional(),
        notes: Joi.string().optional(),
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
    // this.twilioService.sendSms(
    //   phone,
    //   otp + ' code will be expire in 5 minutes.',
    // );
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
