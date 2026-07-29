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
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/ban')
  setBan(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          banned: Joi.boolean().required(),
          reason: Joi.string().trim().max(1000).allow('', null).optional(),
        }),
      ),
    )
    body: { banned: boolean; reason?: string },
  ) {
    return this.usersService.setUserBan(
      id,
      req.user.id,
      body.banned,
      body.reason,
    );
  }
}
