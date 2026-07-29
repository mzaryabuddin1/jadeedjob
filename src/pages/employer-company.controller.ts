import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  Query,
  UploadedFiles,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PagesService } from './pages.service';

const permissionSchema = Joi.object({
  postJobs: Joi.boolean().optional(),
  editJobs: Joi.boolean().optional(),
  viewApplicants: Joi.boolean().optional(),
  chatApplicants: Joi.boolean().optional(),
  manageTeam: Joi.boolean().optional(),
  publishContent: Joi.boolean().optional(),
});

const branchSchema = Joi.object({
  label: Joi.string().required(),
  address: Joi.string().allow('', null).optional(),
  location: Joi.alternatives()
    .try(
      Joi.string().allow('', null),
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }),
    )
    .optional(),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
});

@UseGuards(JwtAuthGuard)
@Controller('employer')
export class EmployerCompanyController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('accounts')
  getAccounts(@Req() req: any) {
    return this.pagesService.getEmployerAccounts(req.user.id);
  }

  @Get('companies/select-options')
  getCompanySelectOptions(@Req() req: any) {
    return this.pagesService.getEmployerCompanySelectOptions(req.user.id);
  }

  @Post('companies')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'verificationDocument', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 10 * 1024 * 1024,
          files: 2,
        },
      },
    ),
  )
  createCompany(
    @Body(
      new JoiValidationPipe(
        Joi.object({
          company_name: Joi.string().trim().max(160).required(),
          username: Joi.string()
            .trim()
            .lowercase()
            .pattern(/^[a-z0-9.-]+$/)
            .max(100)
            .optional(),
          business_name: Joi.string().trim().max(160).allow('', null).optional(),
          industry_type: Joi.string().trim().max(120).allow('', null).optional(),
          company_description: Joi.string().trim().max(4000).allow('', null).optional(),
          official_email: Joi.string().email().allow('', null).optional(),
          official_phone: Joi.string().trim().max(40).allow('', null).optional(),
          website_url: Joi.string().uri().allow('', null).optional(),
          country: Joi.string().trim().max(120).allow('', null).optional(),
          state: Joi.string().trim().max(120).allow('', null).optional(),
          city: Joi.string().trim().max(120).allow('', null).optional(),
          address_line1: Joi.string().trim().max(255).allow('', null).optional(),
          business_registration_number: Joi.string().trim().max(120).allow('', null).optional(),
          tax_identification_number: Joi.string().trim().max(120).allow('', null).optional(),
          registration_authority: Joi.string().trim().max(160).allow('', null).optional(),
          representative_name: Joi.string().trim().max(160).allow('', null).optional(),
          representative_designation: Joi.string().trim().max(120).allow('', null).optional(),
          representative_email: Joi.string().email().allow('', null).optional(),
          representative_phone: Joi.string().trim().max(40).allow('', null).optional(),
          verificationProofType: Joi.string().trim().max(80).required(),
        }),
      ),
    )
    body: any,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      verificationDocument?: Express.Multer.File[];
    },
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    return this.pagesService.createEmployerCompany(
      req.user.id,
      body,
      files?.logo?.[0],
      files?.verificationDocument?.[0],
      idempotencyKey,
    );
  }

  @Get('companies/search')
  searchCompanies(
    @Query(
      new JoiValidationPipe(
        Joi.object({
          q: Joi.string().trim().min(2).max(80).required(),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(30).default(20),
        }),
      ),
    )
    query: { q: string; page: number; limit: number },
    @Req() req: any,
  ) {
    return this.pagesService.searchEmployerCompanies(req.user.id, query);
  }

  @Post('companies/:companyId/access-requests')
  requestAccess(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          message: Joi.string().trim().max(1000).allow('', null).optional(),
          requestedRole: Joi.string().valid('admin', 'editor').default('editor'),
          clientRequestId: Joi.string().trim().max(120).optional(),
        }),
      ),
    )
    body: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    return this.pagesService.requestCompanyAccess(companyId, req.user.id, {
      ...body,
      clientRequestId:
        String(idempotencyKey || '').trim() ||
        body.clientRequestId,
    });
  }

  @Get('companies/:companyId/access-requests')
  getAccessRequests(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('pending', 'approved', 'rejected', 'cancelled', 'all')
            .default('pending'),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
        }),
      ),
    )
    query: any,
    @Req() req: any,
  ) {
    return this.pagesService.getCompanyAccessRequests(
      companyId,
      req.user.id,
      query,
    );
  }

  @Patch('company-access-requests/:requestId')
  reviewAccessRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          action: Joi.string().valid('approve', 'reject').required(),
          role: Joi.string().valid('admin', 'editor').optional(),
          permissions: permissionSchema.optional(),
          reason: Joi.string().trim().max(1000).allow('', null).optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.reviewCompanyAccessRequest(
      requestId,
      req.user.id,
      body,
    );
  }

  @Post('companies/:companyId/verification-submissions')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'verificationDocument', maxCount: 1 }],
      { limits: { fileSize: 10 * 1024 * 1024, files: 1 } },
    ),
  )
  resubmitVerification(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          verificationProofType: Joi.string().trim().max(80).required(),
          message: Joi.string().trim().max(2000).allow('', null).optional(),
        }),
      ),
    )
    body: any,
    @UploadedFiles()
    files: { verificationDocument?: Express.Multer.File[] },
    @Req() req: any,
  ) {
    return this.pagesService.resubmitCompanyVerification(
      companyId,
      req.user.id,
      body,
      files?.verificationDocument?.[0],
    );
  }

  @Post('companies/:companyId/ownership-transfer')
  transferOwnership(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          newOwnerUserId: Joi.number().integer().positive().required(),
          currentPassword: Joi.string().min(1).required(),
        }),
      ),
    )
    body: { newOwnerUserId: number; currentPassword: string },
    @Req() req: any,
  ) {
    return this.pagesService.transferCompanyOwnership(
      companyId,
      req.user.id,
      body.newOwnerUserId,
      body.currentPassword,
    );
  }

  @Get('companies/:companyId')
  getCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Req() req: any,
  ) {
    return this.pagesService.getEmployerCompany(companyId, req.user.id);
  }

  @Patch('companies/:companyId')
  updateCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          name: Joi.string().optional(),
          logoUrl: Joi.string().allow('', null).optional(),
          description: Joi.string().allow('', null).optional(),
          website: Joi.string().allow('', null).optional(),
          socials: Joi.object({
            linkedin: Joi.string().allow('', null).optional(),
            facebook: Joi.string().allow('', null).optional(),
            instagram: Joi.string().allow('', null).optional(),
            twitter: Joi.string().allow('', null).optional(),
            youtube: Joi.string().allow('', null).optional(),
          }).optional(),
          company_name: Joi.string().optional(),
          business_name: Joi.string().allow('', null).optional(),
          company_logo: Joi.string().allow('', null).optional(),
          website_url: Joi.string().allow('', null).optional(),
          official_email: Joi.string().email().allow('', null).optional(),
          official_phone: Joi.string().allow('', null).optional(),
          industry_type: Joi.string().allow('', null).optional(),
          company_description: Joi.string().allow('', null).optional(),
          country: Joi.string().allow('', null).optional(),
          state: Joi.string().allow('', null).optional(),
          city: Joi.string().allow('', null).optional(),
          address_line1: Joi.string().allow('', null).optional(),
          address_line2: Joi.string().allow('', null).optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updateEmployerCompany(companyId, req.user.id, body);
  }

  @Post('companies/:companyId/branches')
  createBranch(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(new JoiValidationPipe(branchSchema)) body: any,
    @Req() req: any,
  ) {
    return this.pagesService.createBranch(companyId, req.user.id, body);
  }

  @Patch('companies/:companyId/branches/:branchId')
  updateBranch(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body(new JoiValidationPipe(branchSchema.fork(['label'], (schema) => schema.optional())))
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updateBranch(companyId, branchId, req.user.id, body);
  }

  @Delete('companies/:companyId/branches/:branchId')
  deleteBranch(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
    @Req() req: any,
  ) {
    return this.pagesService.deleteBranch(companyId, branchId, req.user.id);
  }

  @Get('companies/:companyId/team')
  getTeam(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Req() req: any,
  ) {
    return this.pagesService.getCompanyTeam(companyId, req.user.id);
  }

  @Post('companies/:companyId/team/invite-or-grant')
  inviteOrGrant(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          userId: Joi.number().integer().positive().optional(),
          phone: Joi.string().optional(),
          roleType: Joi.string().valid('admin', 'editor').default('editor'),
          role: Joi.string().valid('admin', 'editor').optional(),
          hasAccess: Joi.boolean().default(true),
          permissions: permissionSchema.optional(),
        }).or('userId', 'phone'),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.inviteOrGrantCompanyTeamMember(
      companyId,
      req.user.id,
      body,
    );
  }

  @Patch('company-team/:memberId/access')
  updateAccess(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          hasAccess: Joi.boolean().required(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updateCompanyTeamAccess(
      memberId,
      req.user.id,
      body.hasAccess,
    );
  }

  @Patch('company-team/:memberId/permissions')
  updatePermissions(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body(new JoiValidationPipe(permissionSchema)) body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updateCompanyTeamPermissions(
      memberId,
      req.user.id,
      body,
    );
  }
}
