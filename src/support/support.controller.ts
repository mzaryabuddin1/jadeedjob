import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { SupportService } from './support.service';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOptionalIdempotencyKey } from 'src/idempotency/idempotency.decorators';

const ticketPaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

@UseGuards(JwtAuthGuard)
@Controller('support')
@ApiTags('Support')
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('contact-info')
  getContactInfo() {
    return this.supportService.getContactInfo();
  }

  @Post('contact-messages')
  createContactMessage(
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          name: Joi.string().optional().strip(),
          phone: Joi.string().optional().strip(),
          subject: Joi.string().trim().max(200).allow('', null).optional(),
          message: Joi.string().trim().min(1).max(5000).required(),
          source: Joi.string().trim().max(80).allow('', null).optional(),
        }),
      ),
    )
    body: any,
  ) {
    return this.supportService.createContactMessage(req.user.id, body);
  }

  @Post('tickets')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiOptionalIdempotencyKey()
  createTicket(
    @Req() req: any,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          kind: Joi.string().valid('feedback', 'complaint').required(),
          category: Joi.string()
            .valid(
              'app',
              'payment',
              'job_post',
              'worker',
              'chat',
              'suggestion',
              'other',
            )
            .default('other'),
          subject: Joi.string().trim().max(200).allow('', null).optional(),
          message: Joi.string().trim().min(1).max(5000).required(),
          preferredContact: Joi.string().max(80).allow('', null).optional(),
          contact: Joi.string().max(255).allow('', null).optional(),
          attachments: Joi.array()
            .items(Joi.string().uri())
            .max(5)
            .optional(),
        }),
      ),
    )
    body: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.supportService.createTicket(
      req.user.id,
      body,
      idempotencyKey,
    );
  }

  @Get('tickets')
  listTickets(
    @Req() req: any,
    @Query(new JoiValidationPipe(ticketPaginationSchema)) query: any,
  ) {
    return this.supportService.listTickets(
      req.user.id,
      query.page,
      query.limit,
    );
  }

  @Get('tickets/:id')
  getTicket(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.supportService.getTicket(id, req.user.id);
  }

  @Get('tickets/:id/messages')
  getMessages(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query(new JoiValidationPipe(ticketPaginationSchema)) query: any,
  ) {
    return this.supportService.getMessages(
      id,
      req.user.id,
      query.page,
      query.limit,
    );
  }

  @Post('tickets/:id/messages')
  addMessage(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
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
      'user',
      body.message,
    );
  }

  @Post('tickets/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  addAttachment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.supportService.addAttachment(req.user.id, id, file);
  }
}
