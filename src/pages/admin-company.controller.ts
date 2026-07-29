import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SystemAdminGuard } from 'src/auth/system-admin.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { PagesService } from './pages.service';

@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  listCompanies(
    @Query(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid(
              'pending',
              'approved',
              'needs_changes',
              'rejected',
              'suspended',
              'all',
            )
            .default('pending'),
          q: Joi.string().trim().max(80).allow('').optional(),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
        }),
      ),
    )
    query: any,
  ) {
    return this.pagesService.getAdminCompanyReviews(query);
  }

  @Get(':companyId')
  getCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.pagesService.getAdminCompanyReview(companyId);
  }

  @Patch(':companyId/verification')
  updateVerification(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('approved', 'needs_changes', 'rejected', 'suspended')
            .required(),
          reason: Joi.string().trim().max(1000).allow('', null).optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updateCompanyVerification(
      companyId,
      req.user.id,
      body.status,
      body.reason,
    );
  }
}
