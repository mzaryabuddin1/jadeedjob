import {
  Controller,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  UsePipes,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import * as Joi from 'joi';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { FilesService } from 'src/files/files.service';

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

const documentUploadOptions = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const uploadPath = './uploads/profile-documents';
      mkdirSync(uploadPath, { recursive: true });
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      const uniqueName = `${Date.now()}-${randomBytes(6).toString('hex')}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      callback(new BadRequestException('Unsupported document file type') as any, false);
      return;
    }

    callback(null, true);
  },
};

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    if (!userId) throw new NotFoundException('User not found or unauthorized');

    return this.usersService.getMyProfileResponse(userId);
  }

  @Patch('me')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        email: Joi.string().email().allow('', null).optional(),
        firstName: optionalString(),
        lastName: optionalString(),
        country: optionalRelationId(),
        countryId: optionalRelationId(),
        language: optionalRelationId(),
        languageId: optionalRelationId(),

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

        skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        technical_skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        soft_skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        languages_spoken: Joi.array().max(20).items(spokenLanguageSchema).optional(),

        work_experience: Joi.array().max(25).items(workExperienceSchema).optional(),
        education: Joi.array().max(25).items(educationSchema).optional(),
        certifications: Joi.array().max(25).items(certificationSchema).optional(),

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
      'password',
      'phone',
      'isBanned',
      'isVerified',
      'verified_by_admin_id',
      'kyc_status',
      'verification_date',
      'rejection_reason',
      'referralCode',
      'tokenVersion',
      'phoneVerifiedAt',
      'admin_notes',
    ];
    forbidden.forEach((field) => delete body[field]);

    // Update normal profile fields
    await this.usersService.updateMyProfile(userId, body);

    // 🔥 If filter_preferences changed, update DB + Firebase topics
    if (newFilterPreferences !== undefined) {
      await this.usersService.updateUserFilterPreferences(
        userId,
        newFilterPreferences,
      );
    }

    const profile = await this.usersService.getMyProfileResponse(userId);

    return {
      message: 'Profile updated successfully',
      ...profile,
    };
  }

  @Post('me/documents')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  async uploadMyDocument(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          type: Joi.string()
            .valid('id_front', 'id_back', 'address_proof', 'profile_photo')
            .required(),
        }),
      ),
    )
    body: any,
  ) {
    const userId = (req.user as any)?.id;
    if (!userId) throw new NotFoundException('User not found or unauthorized');
    if (!file) throw new BadRequestException('No file provided');

    const fileUrl = this.filesService.getFileUrl(
      file.filename,
      'profile-documents',
    );
    const profile = await this.usersService.updateProfileDocument(
      userId,
      body.type,
      fileUrl,
    );

    return {
      message: 'Document uploaded successfully',
      fileName: file.filename,
      fileUrl,
      ...profile,
    };
  }

  @Get('me/preferences')
  async getMyPreferences(@Req() req: any) {
    return await this.usersService.getUserPreference(req.user.id);
  }
}
