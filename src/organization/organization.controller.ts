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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@ApiTags('Organization')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'industry'],
      properties: {
        name: { type: 'string', example: 'Acme Corp' },
        industry: { type: 'string', example: 'Technology' },
        username: { type: 'string', example: 'acme-corp' },
        members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user: { type: 'number' },
              role: { type: 'string', enum: ['admin', 'user'] },
            },
          },
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Add organization member' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organization', 'user', 'role'],
      properties: {
        organization: { type: 'number', example: 1 },
        user: { type: 'number', example: 2 },
        role: { type: 'string', enum: ['admin', 'user'], example: 'user' },
      },
    },
  })
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
  @ApiOperation({ summary: 'Remove organization member' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organization', 'user'],
      properties: {
        organization: { type: 'number', example: 1 },
        user: { type: 'number', example: 2 },
      },
    },
  })
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
@ApiOperation({ summary: 'List organizations' })
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
