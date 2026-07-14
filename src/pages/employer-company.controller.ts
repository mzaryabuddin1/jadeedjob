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
} from '@nestjs/common';
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
