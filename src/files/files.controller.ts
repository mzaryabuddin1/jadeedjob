import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';

@Controller('files')
@ApiTags('Files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly storageService: ObjectStorageService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an authenticated private asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: FileUploadResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const asset = await this.storageService.store({
      ownerUserId: req.user.id,
      purpose: 'general-uploads',
      file,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/quicktime',
        'audio/mpeg',
        'audio/mp4',
      ],
      maxBytes: 20 * 1024 * 1024,
      visibility: 'private',
      metadata: { source: 'files/upload' },
    });
    const fileUrl = await this.storageService.getUrl(asset);
    return {
      message: 'File uploaded successfully',
      fileName: asset.originalName,
      fileUrl,
      assetId: asset.id,
      contentType: asset.contentType,
      sizeBytes: Number(asset.sizeBytes),
    };
  }
}
