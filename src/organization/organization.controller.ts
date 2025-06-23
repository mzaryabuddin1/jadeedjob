import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  UsePipes,
  Param,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { Types } from 'mongoose';
@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().required(),
        industry: Joi.string().required(),
        members: Joi.array()
          .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
          .optional(),
      }),
    ),
  )
  async create(@Body() body: any, @Req() req: any) {
    return this.orgService.createOrg({
      ...body,
      createdBy: req.user.id,
    });
  }

@Post('member')
@UsePipes(
  new JoiValidationPipe(
    Joi.object({
      organization: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
      user: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required(),
      role: Joi.string().valid('admin', 'user').required(),
    }),
  ),
)
async addMember(@Body() body: any, @Req() req: any) {
  return this.orgService.addMember(body.organization, body, req.user.id);
}


  @Get('my')
  async getMine(@Req() req: any) {
    return this.orgService.getMyOrganizations(req.user.id);
  }
}
