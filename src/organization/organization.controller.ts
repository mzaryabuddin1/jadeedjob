// src/organization/organization.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  UsePipes,
  Delete,
  Query,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

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
        username: Joi.string()
          .regex(/^[a-z0-9.-]+$/)
          .min(3)
          .max(50)
          .optional(),
        members: Joi.array()
          .items(
            Joi.object({
              user: Joi.number().required(),
              role: Joi.string().valid('admin', 'user').default('user'),
            }),
          )
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
        organization: Joi.number().required(),
        user: Joi.number().required(),
        role: Joi.string().valid('admin', 'user').required(),
      }),
    ),
  )
  async addMember(@Body() body: any, @Req() req: any) {
    return this.orgService.addMember(
      body.organization,
      { userId: body.user, role: body.role },
      req.user.id,
    );
  }

  // src/organization/organization.controller.ts

  @Delete('member/remove')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        organization: Joi.number().required(),
        user: Joi.number().required(),
      }),
    ),
  )
  async removeMember(@Body() body: any, @Req() req: any) {
    return this.orgService.removeMember(
      body.organization,
      body.user,
      req.user.id,
    );
  }


@Get()
async getOrganizations(
  @Req() req: any,
  @Query('mine') mine?: string,
  @Query('search') search?: string,
  @Query('page') page = 1,
  @Query('limit') limit = 20,
  @Query('sortBy') sortBy = 'createdAt',
  @Query('sortOrder') sortOrder: string = 'DESC',
) {
  return this.orgService.getOrganizations({
    userId: req.user.id,
    mine: mine === 'true',
    search,
    page: Number(page),
    limit: Number(limit),
    sortBy,
    sortOrder: sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  });
}
}
