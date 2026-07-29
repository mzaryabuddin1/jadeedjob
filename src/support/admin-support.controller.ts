import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SystemAdminGuard } from 'src/auth/system-admin.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { SupportService } from './support.service';

@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('admin/support/tickets')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  list(
    @Query(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('open', 'in_progress', 'resolved', 'closed', 'all')
            .default('open'),
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
        }),
      ),
    )
    query: any,
  ) {
    return this.supportService.listAdminTickets(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getAdminTicket(id);
  }

  @Post(':id/messages')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          message: Joi.string().trim().min(1).max(5000).required(),
        }),
      ),
    )
    body: { message: string },
  ) {
    return this.supportService.addMessage(
      id,
      req.user.id,
      'support',
      body.message,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          status: Joi.string()
            .valid('open', 'in_progress', 'resolved', 'closed')
            .required(),
        }),
      ),
    )
    body: any,
  ) {
    return this.supportService.updateTicketStatus(id, body.status);
  }
}
