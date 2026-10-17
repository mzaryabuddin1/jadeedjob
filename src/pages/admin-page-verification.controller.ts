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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { AdminKeyGuard } from './admin-key.guard';
import { PageVerificationService } from './page-verification.service';

/**
 * Staff tool: review the documents of pages asking for the verified tick.
 * Header `x-admin-key` = env ADMIN_API_KEY (optional `x-admin-name` = who is
 * reviewing). UI: /page-verification-admin.html. Hidden from Swagger.
 */
@ApiExcludeController()
@UseGuards(AdminKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('admin/page-verifications')
export class AdminPageVerificationController {
  constructor(private readonly service: PageVerificationService) {}

  private reviewer(req: any): string {
    return (
      String(req.headers['x-admin-name'] ?? 'admin')
        .trim()
        .slice(0, 60) || 'admin'
    );
  }

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit = '50') {
    return this.service.adminList(status, Number(limit) || 50);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminGet(id);
  }

  @Get(':id/documents/:index')
  async document(
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
  ) {
    const { path, doc } = await this.service.adminDocument(id, index);
    return new StreamableFile(createReadStream(path), {
      type: doc.mimeType,
      disposition: `inline; filename="${doc.originalName.replace(/"/g, '')}"`,
    });
  }

  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.approve(id, this.reviewer(req));
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const reason = String(body?.reason ?? '').trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new BadRequestException('Give a reason (3-500 characters)');
    }
    return this.service.reject(id, reason, this.reviewer(req));
  }

  @Post('pages/:pageId/unverify')
  unverify(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const reason = String(body?.reason ?? '').trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new BadRequestException('Give a reason (3-500 characters)');
    }
    return this.service.unverify(pageId, reason, this.reviewer(req));
  }
}
