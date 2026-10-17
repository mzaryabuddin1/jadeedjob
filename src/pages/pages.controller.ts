// src/pages/pages.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import Joi from 'joi';
import { PagesService } from './pages.service';
import { PageInvitationsService } from './page-invitations.service';
import {
  PRIVATE_UPLOAD_DIR,
  PageVerificationService,
} from './page-verification.service';
import { VERIFICATION_DOC_TYPES } from './entities/page-verification.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';

// ── validation ───────────────────────────────────────────────

const str = () => Joi.string().trim();
const profileFields = {
  business_name: str().max(150),
  page_logo: str().max(500),
  website_url: Joi.string().uri(),
  official_email: Joi.string().email(),
  official_phone: str().max(40),
  industry_type: str().max(100),
  page_description: Joi.string().max(5000),
  founded_year: Joi.number().integer().min(1800).max(new Date().getFullYear()),
  country: str().max(100),
  state: str().max(100),
  city: str().max(100),
  postal_code: str().max(20),
  address_line1: str().max(200),
  address_line2: str().max(200),
  google_maps_link: str().max(500),
  business_registration_number: str().max(100),
  tax_identification_number: str().max(100),
  registration_authority: str().max(150),
  business_license_document: str().max(500),
  page_type: str().max(100),
  representative_name: str().max(150),
  representative_designation: str().max(100),
  representative_email: Joi.string().email(),
  representative_phone: str().max(40),
  id_proof_document: str().max(500),
  linkedin_page_url: str().max(300),
  facebook_page_url: str().max(300),
  instagram_page_url: str().max(300),
  twitter_page_url: str().max(300),
  youtube_channel_url: str().max(300),
  verified_email_domain: str().max(150),
  number_of_employees: Joi.number().integer().min(0),
  annual_revenue_range: str().max(100),
  client_list: Joi.array().items(Joi.string()),
  certifications: Joi.array().items(Joi.string()),
};

const usernameRule = Joi.string().trim().lowercase();

const createPageSchema = Joi.object({
  page_name: str().min(2).max(120).required(),
  username: usernameRule,
  ...profileFields,
});

const updatePageSchema = Joi.object({
  page_name: str().min(2).max(120),
  username: usernameRule,
  ...profileFields,
}).min(1);

const inviteSchema = Joi.object({
  userId: Joi.number().integer().positive(),
  username: Joi.string().trim(),
  role: Joi.string().valid('admin', 'editor').required(),
})
  .or('userId', 'username')
  .messages({ 'object.missing': 'Send userId or username of the person' });

const roleSchema = Joi.object({
  role: Joi.string().valid('admin', 'editor').required(),
});

// ── swagger ──────────────────────────────────────────────────

const pageProperties = {
  page_name: { type: 'string', example: 'Acme Traders' },
  username: {
    type: 'string',
    example: 'acme-traders',
    description:
      'Unique page handle (3-40: a-z, 0-9, dot, dash). Auto-generated from the name when omitted',
  },
  business_name: { type: 'string' },
  page_logo: { type: 'string', example: 'https://.../logo.png' },
  website_url: { type: 'string', example: 'https://acme.com' },
  official_email: { type: 'string', example: 'hr@acme.com' },
  official_phone: { type: 'string' },
  industry_type: { type: 'string', example: 'Logistics' },
  page_description: { type: 'string' },
  founded_year: { type: 'number', example: 2015 },
  country: { type: 'string' },
  state: { type: 'string' },
  city: { type: 'string' },
  postal_code: { type: 'string' },
  address_line1: { type: 'string' },
  address_line2: { type: 'string' },
  google_maps_link: { type: 'string' },
  page_type: { type: 'string', example: 'Private Limited' },
  business_registration_number: {
    type: 'string',
    description: 'Private: only owner/admin see it',
  },
  tax_identification_number: { type: 'string', description: 'Private' },
  registration_authority: { type: 'string', description: 'Private' },
  representative_name: { type: 'string', description: 'Private' },
  representative_designation: { type: 'string', description: 'Private' },
  representative_email: { type: 'string', description: 'Private' },
  representative_phone: { type: 'string', description: 'Private' },
  linkedin_page_url: { type: 'string' },
  facebook_page_url: { type: 'string' },
  instagram_page_url: { type: 'string' },
  twitter_page_url: { type: 'string' },
  youtube_channel_url: { type: 'string' },
  number_of_employees: { type: 'number' },
  annual_revenue_range: { type: 'string', description: 'Private' },
  client_list: { type: 'array', items: { type: 'string' } },
  certifications: { type: 'array', items: { type: 'string' } },
};

// ── verification uploads (private folder, never served statically) ──

const verificationUpload = {
  storage: diskStorage({
    destination: PRIVATE_UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`,
      ),
  }),
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.mimetype)) {
      return cb(
        new BadRequestException('Only PDF, JPG, PNG or WEBP files are allowed'),
        false,
      );
    }
    cb(null, true);
  },
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
};

@ApiTags('Pages')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly invitations: PageInvitationsService,
    private readonly verification: PageVerificationService,
  ) {}

  // ═════ static routes first (they must not be swallowed by `:id`) ═════

  @Get('roles')
  @ApiOperation({
    summary: 'Page roles and what each can do',
    description:
      'owner / admin / editor with their permissions, plus the extra rules. Use it to build the "manage access" screen.',
  })
  roles() {
    return this.pagesService.getRoles();
  }

  @Get('invitations/me')
  @ApiOperation({
    summary: 'My pending page invitations',
    description: 'Invitations other pages sent me. Accept or decline each one.',
  })
  myInvitations(@Req() req: any) {
    return this.invitations.listMine(req.user.id);
  }

  @Post('invitations/:invitationId/accept')
  @ApiOperation({
    summary: 'Accept a page invitation (only the invited user can)',
    description:
      'This is what grants the access: the user becomes a member with the invited role. The inviter gets a notification.',
  })
  acceptInvitation(
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Req() req: any,
  ) {
    return this.invitations.accept(invitationId, req.user.id);
  }

  @Post('invitations/:invitationId/decline')
  @ApiOperation({ summary: 'Decline a page invitation' })
  declineInvitation(
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Req() req: any,
  ) {
    return this.invitations.decline(invitationId, req.user.id);
  }

  // ═════ pages ═════

  @Post()
  @ApiOperation({
    summary: 'Create a page',
    description:
      'A page is the company profile on JobsLoot. The creator becomes its **owner**. Jobs can then be posted under the page (`pageId`) or individually.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['page_name'],
      properties: pageProperties,
    },
  })
  createPage(
    @Body(new JoiValidationPipe(createPageSchema)) body: any,
    @Req() req: any,
  ) {
    return this.pagesService.createPage(body, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List / search pages',
    description:
      'Public profile fields only (+ `is_verified`). Each item has `myRole` / `permissions` for the caller. `mine=true` = pages I own or belong to.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiQuery({ name: 'verified', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'max 50',
  })
  getPages(@Query() query: any, @Req() req: any) {
    return this.pagesService.getPages(query, req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a page',
    description:
      "Public profile for everybody. Owner/admin also get the private business details and `verification_status`. Always includes the caller's `myRole` and `permissions`.",
  })
  getPageById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.pagesService.getPageById(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a page (owner / admin)',
    description:
      'Profile fields only. Ratings, owner and the verified tick cannot be edited here.',
  })
  @ApiBody({ schema: { type: 'object', properties: pageProperties } })
  updatePage(
    @Param('id', ParseIntPipe) id: number,
    @Body(new JoiValidationPipe(updatePageSchema)) body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updatePage(id, body, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a page (owner only)',
    description:
      "The page's jobs are kept but deactivated and become personal jobs of their poster; members, invitations, verification documents and page ratings are removed.",
  })
  deletePage(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.pagesService.deletePage(id, req.user.id);
  }

  // ═════ members & roles ═════

  @Get(':pageId/members')
  @ApiOperation({
    summary: 'Members of a page (any member)',
    description:
      'Owner first, then admins and editors with name, username and role.',
  })
  members(@Param('pageId', ParseIntPipe) pageId: number, @Req() req: any) {
    return this.pagesService.listMembers(pageId, req.user.id);
  }

  @Post(':pageId/members')
  @ApiOperation({
    summary: 'Give someone access (sends an invitation)',
    description:
      '**Deprecated alias of `POST /pages/:pageId/invitations`.** Nobody is added directly: the user gets an invitation and must accept it.',
    deprecated: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        userId: { type: 'number', example: 2 },
        username: { type: 'string', example: 'alikhan_k3f9a' },
        role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
      },
    },
  })
  addMember(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body(new JoiValidationPipe(inviteSchema)) body: any,
    @Req() req: any,
  ) {
    return this.invitations.invite(pageId, req.user.id, body, body.role);
  }

  @Patch(':pageId/members/:userId/role')
  @ApiOperation({
    summary: "Change a member's role (owner only)",
    description:
      'Promote editor -> admin or demote admin -> editor. The owner role cannot be changed.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', enum: ['admin', 'editor'], example: 'admin' },
      },
    },
  })
  changeMemberRole(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new JoiValidationPipe(roleSchema)) body: any,
    @Req() req: any,
  ) {
    return this.pagesService.changeMemberRole(
      pageId,
      userId,
      body.role,
      req.user.id,
    );
  }

  @Delete(':pageId/members/me')
  @ApiOperation({
    summary: 'Leave a page',
    description:
      'Any member except the owner (the owner deletes the page instead).',
  })
  leave(@Param('pageId', ParseIntPipe) pageId: number, @Req() req: any) {
    return this.pagesService.leavePage(pageId, req.user.id);
  }

  @Delete(':pageId/members/:userId')
  @ApiOperation({
    summary: 'Remove a member',
    description:
      'The owner removes anyone except themself; an admin removes editors only.',
  })
  removeMember(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    return this.pagesService.removeMember(pageId, userId, req.user.id);
  }

  // ═════ invitations (page side) ═════

  @Post(':pageId/invitations')
  @ApiOperation({
    summary: 'Invite someone to the page',
    description: [
      'Send `userId` **or** `username` plus the `role` they will get.',
      'The user is notified (push/email per their settings) and **must accept** - only then do they get access.',
      'Only the owner can invite an `admin`; an admin can invite `editor`s. Invitations expire after 7 days.',
    ].join('\n'),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        userId: { type: 'number', example: 2 },
        username: { type: 'string', example: 'alikhan_k3f9a' },
        role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
      },
    },
  })
  invite(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body(new JoiValidationPipe(inviteSchema)) body: any,
    @Req() req: any,
  ) {
    return this.invitations.invite(pageId, req.user.id, body, body.role);
  }

  @Get(':pageId/invitations')
  @ApiOperation({
    summary: 'Pending invitations of a page (owner / admin)',
  })
  pageInvitations(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Req() req: any,
  ) {
    return this.invitations.listForPage(pageId, req.user.id);
  }

  @Delete(':pageId/invitations/:invitationId')
  @ApiOperation({
    summary: 'Cancel a pending invitation',
    description: 'Owner cancels any; an admin cancels editor invitations only.',
  })
  cancelInvitation(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Req() req: any,
  ) {
    return this.invitations.cancel(pageId, invitationId, req.user.id);
  }

  // ═════ verification ═════

  @Post(':pageId/verification')
  @ApiOperation({
    summary: 'Ask for the verified tick (upload company documents)',
    description: [
      'Owner/admin uploads 1-5 documents (PDF/JPG/PNG/WEBP, max 10 MB each). Our team reviews them; you are notified of the result and an approved page gets the verified tick (`is_verified`).',
      `\`documentTypes\`: JSON array or comma list in the same order as the files, from: ${VERIFICATION_DOC_TYPES.join(', ')} (default \`other\`).`,
      'Documents are stored privately - never publicly downloadable. One request at a time; after a rejection you can send again.',
    ].join('\n'),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documents'],
      properties: {
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 5,
        },
        documentTypes: {
          type: 'string',
          example: '["business_license","tax_document"]',
        },
        notes: { type: 'string', example: 'Registered in 2015, SECP no. ...' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('documents', 5, verificationUpload))
  async submitVerification(
    @Param('pageId', ParseIntPipe) pageId: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() body: { documentTypes?: string; notes?: string },
    @Req() req: any,
  ) {
    const uploaded = files ?? [];
    try {
      const { page } = await this.pagesService.requirePermission(
        pageId,
        req.user.id,
        'verification.submit',
        'request verification',
      );
      return await this.verification.submit(page, req.user.id, uploaded, body);
    } catch (err) {
      await this.verification.discardUploads(uploaded); // never keep files of a refused request
      throw err;
    }
  }

  @Get(':pageId/verification')
  @ApiOperation({
    summary: 'Verification status of a page (owner / admin)',
    description:
      '`status`: none / pending / verified / rejected, the latest request (with the rejection reason) and history.',
  })
  async verificationStatus(
    @Param('pageId', ParseIntPipe) pageId: number,
    @Req() req: any,
  ) {
    const { page } = await this.pagesService.requirePermission(
      pageId,
      req.user.id,
      'verification.view',
      'see the verification status',
    );
    return this.verification.getStatus(page);
  }
}
