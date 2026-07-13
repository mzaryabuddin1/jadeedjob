import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  UsePipes,
  Get,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { AuthService } from 'src/auth/auth.service';

const optionalString = () => Joi.string().allow('', null).optional();
const optionalUri = () => Joi.string().uri().allow('', null).optional();
const optionalDate = () =>
  Joi.alternatives()
    .try(Joi.date(), Joi.string().allow('', null))
    .optional();
const optionalRelationId = () =>
  Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/),
      Joi.string().allow('', null),
    )
    .optional();

const workExperienceSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  company_name: optionalString(),
  designation: optionalString(),
  department: optionalString(),
  employment_type: optionalString(),
  from_date: optionalDate(),
  to_date: optionalDate(),
  key_responsibilities: optionalString(),
  experience_certificate: optionalString(),
  currently_working: Joi.boolean().optional(),
});

const educationSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  highest_qualification: optionalString(),
  institution_name: optionalString(),
  graduation_year: optionalString(),
  gpa_or_grade: optionalString(),
  degree_document: optionalString(),
});

const certificationSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  certification_name: optionalString(),
  issuing_institution: optionalString(),
  certification_date: optionalDate(),
  certificate_file: optionalString(),
});

const spokenLanguageSchema = Joi.object({
  language: optionalString(),
  level: optionalString(),
});

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    if (!userId) throw new NotFoundException('User not found or unauthorized');

    const user = await this.usersService.getPublicUserById(userId);

    return { user };
  }

  @Patch('me')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().allow('', null).optional(),
        firstName: optionalString(),
        lastName: optionalString(),
        phone: optionalString(),
        country: optionalRelationId(),
        language: optionalRelationId(),
        password: Joi.string()
          .min(6)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
          .message(
            'Password must include uppercase, lowercase, number, and special character',
          )
          .optional(),

        // 🔥 filter_preferences allowed here
        filter_preferences: Joi.array()
          .items(Joi.number().integer().positive())
          .optional(),

        full_name: optionalString(),
        father_name: optionalString(),
        gender: Joi.string()
          .valid('Male', 'Female', 'Other', '')
          .allow(null)
          .optional(),
        date_of_birth: optionalDate(),
        nationality: optionalString(),
        marital_status: Joi.string()
          .valid('Single', 'Married', 'Other', '')
          .allow(null)
          .optional(),
        profile_photo: optionalUri(),

        alternate_phone: optionalString(),
        address_line1: optionalString(),
        address_line2: optionalString(),
        city: optionalString(),
        state: optionalString(),
        postal_code: optionalString(),
        contact_country: optionalString(),

        national_id_number: optionalString(),
        passport_number: optionalString(),
        id_expiry_date: optionalDate(),
        id_document_front: optionalUri(),
        id_document_back: optionalUri(),
        address_proof_document: optionalUri(),

        professional_summary: optionalString(),

        skills: Joi.array().items(Joi.string()).optional(),
        technical_skills: Joi.array().items(Joi.string()).optional(),
        soft_skills: Joi.array().items(Joi.string()).optional(),
        languages_spoken: Joi.array().items(spokenLanguageSchema).optional(),

        work_experience: Joi.array().items(workExperienceSchema).optional(),
        education: Joi.array().items(educationSchema).optional(),
        certifications: Joi.array().items(certificationSchema).optional(),

        linkedin_url: optionalUri(),
        github_url: optionalUri(),
        portfolio_url: optionalUri(),
        behance_url: optionalUri(),

        bank_name: optionalString(),
        account_number: optionalString(),
        iban: optionalString(),
        branch_name: optionalString(),
        swift_code: optionalString(),

        notes: optionalString(),
      }),
    ),
  )
  async updateMe(@Req() req: Request, @Body() body: any) {
    const userId = (req.user as any)?.id;
    if (!userId) throw new NotFoundException('User not found or unauthorized');

    // Extract filter_preferences if present
    let newFilterPreferences: number[] | undefined;
    if (Array.isArray(body.filter_preferences)) {
      newFilterPreferences = body.filter_preferences;
      delete body.filter_preferences; // avoid double handling in usersService
    }

    // Remove forbidden fields
    const forbidden = [
      'passwordHash',
      'passwordSalt',
      'isBanned',
      'isVerified',
      'verified_by_admin_id',
      'kyc_status',
      'verification_date',
      'rejection_reason',
    ];
    forbidden.forEach((field) => delete body[field]);

    // Password update
    if (body?.password) {
      const { salt, hash } = this.authService.hashPassword(body.password);
      body.passwordHash = hash;
      body.passwordSalt = salt;
      delete body.password;
    }

    // Update normal profile fields
    let updatedUser = await this.usersService.updateMyProfile(userId, body);

    // 🔥 If filter_preferences changed, update DB + Firebase topics
    if (newFilterPreferences !== undefined) {
      const normalizedFilterPreferences =
        await this.usersService.updateUserFilterPreferences(
          userId,
          newFilterPreferences,
        );
      // reflect in response
      (updatedUser as any).filter_preferences = normalizedFilterPreferences;
      updatedUser = await this.usersService.getPublicUserById(userId);
    }

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  @Get('me/preferences')
  async getMyPreferences(@Req() req: any) {
    return await this.usersService.getUserPreference(req.user.id);
  }
}
