import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
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
