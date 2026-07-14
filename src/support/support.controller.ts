import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { FilesService } from 'src/files/files.service';
import { SupportService } from './support.service';

const supportAttachmentUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = './uploads/support-tickets';
      require('fs').mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly filesService: FilesService,
  ) {}

  @Get('contact-info')
  getContactInfo() {
    return this.supportService.getContactInfo();
  }

  @Post('contact-messages')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().required(),
        subject: Joi.string().required(),
        message: Joi.string().required(),
        source: Joi.string().allow('', null).optional(),
      }),
    ),
  )
  createContactMessage(@Req() req: any, @Body() body: any) {
    return this.supportService.createContactMessage(req.user.id, body);
  }

  @Post('tickets')
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        kind: Joi.string().valid('feedback', 'complaint').required(),
        category: Joi.string()
          .valid('app', 'payment', 'job_post', 'worker', 'chat', 'suggestion', 'other')
          .default('other'),
        message: Joi.string().required(),
        preferredContact: Joi.string().allow('', null).optional(),
        contact: Joi.string().allow('', null).optional(),
        attachments: Joi.array().items(Joi.string().uri()).optional(),
      }),
    ),
  )
  createTicket(@Req() req: any, @Body() body: any) {
    return this.supportService.createTicket(req.user.id, body);
  }

  @Get('tickets')
  listTickets(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportService.listTickets(req.user.id, Number(page), Number(limit));
  }

  @Post('tickets/:id/attachments')
  @UseInterceptors(FileInterceptor('file', supportAttachmentUploadOptions))
  addAttachment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    return this.supportService.addAttachment(
      req.user.id,
      id,
      file,
      this.filesService.getFileUrl(file.filename, 'support-tickets'),
    );
  }
}
