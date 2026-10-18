import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  MEDIA_DIR,
  MULTER_HARD_LIMIT,
  MediaService,
  allowedMimeTypes,
  extensionFor,
} from './media.service';

/**
 * Step 1 of publishing a post/reel: upload each image or video here, then
 * send the returned `id`s in `POST /posts`.
 */
@ApiTags('Media')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload an image or video for a post / reel',
    description: [
      'Multipart field `file`. Images: JPG, PNG, WEBP, GIF (max 10 MB). Videos: MP4, MOV, WEBM (max 100 MB). The real file content is checked, not only its name.',
      'Returns `{ id, kind, url, mimeType, size }`. Send the `id` in `mediaIds` of `POST /posts` (a reel needs exactly one video; send an image id as `thumbnailMediaId` for the cover).',
      'Files that no post uses within 24 hours are deleted automatically. Videos support seeking (HTTP range requests).',
    ].join('\n'),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: MEDIA_DIR,
        filename: (req: any, file, cb) =>
          cb(
            null,
            `${req.user?.id ?? 0}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionFor(file.mimetype)}`,
          ),
      }),
      fileFilter: (_req, file, cb) => {
        if (!allowedMimeTypes().includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, WEBP, GIF images and MP4, MOV, WEBM videos are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { files: 1, fileSize: MULTER_HARD_LIMIT },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file provided (field: file)');
    return this.media.register(req.user.id, file);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an uploaded file that no post uses yet',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.media.deleteUnused(req.user.id, id);
  }
}
