import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FilesService } from 'src/files/files.service';
import {
  createJobSchema,
  parseJobBody,
  updateJobSchema,
} from './job.validation';
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype?.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
    return cb(
      new Error('Only image files are allowed (jpeg, png, webp, gif)'),
      false,
    );
  }
  cb(null, true);
};

const picturesMulter = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, callback) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: imageFileFilter,
  limits: { files: 4, fileSize: 5 * 1024 * 1024 },
};

function validateBody(schema: typeof createJobSchema, body: any) {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors: error.details.map((err) => err.message),
    });
  }
  return value;
}

function mergePictures(
  urlsFromBody: string[] | undefined,
  files: Express.Multer.File[] | undefined,
  filesService: FilesService,
): string[] | undefined {
  const urls = [...(urlsFromBody || [])];
  if (files?.length) {
    for (const f of files) {
      urls.push(filesService.getFileUrl(f.filename));
    }
  }
  if (urls.length > 4) {
    throw new BadRequestException('Maximum 4 pictures allowed');
  }
  return urls.length ? urls : undefined;
}

const jobBodyProperties = {
  title: { type: 'string', example: 'Warehouse Helper' },
  filterIds: {
    type: 'array',
    items: { type: 'number' },
    example: [1, 11, 17],
    description: 'One or more filter category ids (preferred, max 10)',
  },
  filterId: {
    type: 'number',
    example: 1,
    description: 'Legacy single category — use filterIds instead',
  },
  description: {
    type: 'string',
    example: 'Need helpers for loading',
    nullable: true,
    description: 'Optional',
  },
  isRemote: {
    type: 'boolean',
    example: false,
    description: 'If true, location is optional; otherwise location is required',
  },
  pageId: { type: 'number', nullable: true },
  requirements: { type: 'string' },
  benefits: { type: 'array', items: { type: 'string' }, example: ['Meals'] },
  shifts: {
    type: 'array',
    items: {
      type: 'string',
      enum: ['morning', 'evening', 'night', 'rotational'],
    },
  },
  jobTypes: {
    type: 'array',
    items: {
      type: 'string',
      enum: [
        'full-time',
        'part-time',
        'contract',
        'temporary',
        'freelance',
        'internship',
      ],
    },
  },
  salaryType: {
    type: 'string',
    enum: [
      'piece-rate',
      'daily-wage',
      'hourly',
      'monthly',
      'fixed',
      'commission',
      'negotiable',
    ],
    example: 'daily-wage',
  },
  salaryAmount: { type: 'number', example: 1500 },
  currency: { type: 'string', example: 'PKR' },
  location: {
    type: 'object',
    nullable: true,
    properties: {
      lat: { type: 'number', example: 24.8607 },
      lng: { type: 'number', example: 67.0011 },
    },
    description: 'Required when isRemote is false; optional when remote',
  },
  pictures: {
    type: 'array',
    items: { type: 'string', format: 'binary' },
    maxItems: 4,
    description: 'Optional image files (max 4). Or send picture URLs as JSON array.',
  },
  startDate: { type: 'string', format: 'date' },
  endDate: { type: 'string', format: 'date' },
  industry: { type: 'string' },
  educationLevel: { type: 'string' },
  experienceRequired: { type: 'string' },
  languageRequirements: {
    type: 'array',
    items: { type: 'string' },
  },
};

@ApiTags('Jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('job')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create job',
    description: [
      '- **Categories:** `filterIds` (1–10) or legacy `filterId`',
      '- **Pictures:** optional, max **4** images (`multipart` field `pictures`) or URL array',
      '- **Remote:** `isRemote: true` → `location` optional; otherwise `location` required',
      '- **Description:** optional',
      '- Other fields remain optional',
    ].join('\n'),
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'salaryType', 'salaryAmount'],
      properties: jobBodyProperties,
    },
  })
  @UseInterceptors(FilesInterceptor('pictures', 4, picturesMulter))
  async createJob(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: any,
  ) {
    const parsed = parseJobBody(body);
    const data = validateBody(createJobSchema, parsed);
    const pictures = mergePictures(data.pictures, files, this.filesService);

    return this.jobService.createJob(
      {
        ...data,
        pictures: pictures ?? null,
        description: data.description || null,
        createdBy: req.user.id,
      },
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List jobs' })
  async findJobs(@Query() query: any, @Req() req: any) {
    return this.jobService.findJobs(query, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by id' })
  async findJob(@Param('id') id: number) {
    return this.jobService.findJobById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update job',
    description: [
      'Partial update. Same rules as create:',
      '- `filterIds` / `filterId` to replace categories',
      '- `isRemote: true` clears requirement for location (sets remote)',
      '- `pictures` files or URLs replace existing (max 4)',
    ].join('\n'),
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: jobBodyProperties,
    },
  })
  @UseInterceptors(FilesInterceptor('pictures', 4, picturesMulter))
  async patchJob(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: any,
  ) {
    const parsed = parseJobBody(body);
    const data = validateBody(updateJobSchema, parsed);

    const hasPictureInput =
      data.pictures !== undefined || (files && files.length > 0);
    if (hasPictureInput) {
      data.pictures = mergePictures(data.pictures, files, this.filesService) ?? [];
    }

    // If switching to remote without location, clear it in service via isRemote
    if (data.isRemote === true && data.location === undefined) {
      // keep location undefined; service nulls when isRemote
    }

    if (data.isRemote === false && data.location !== undefined) {
      // on-site with new location — service validates
    }

    return this.jobService.updateJob(id, data, req.user.id);
  }
}
