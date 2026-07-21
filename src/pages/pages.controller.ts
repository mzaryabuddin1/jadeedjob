// src/pages/pages.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UsePipes,
  Patch,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        company_name: Joi.string().required(),
        business_name: Joi.string().optional(),
        company_logo: Joi.string().optional(),
        website_url: Joi.string().uri().optional(),
        official_email: Joi.string().email().optional(),
        official_phone: Joi.string().optional(),
        industry_type: Joi.string().optional(),
        company_description: Joi.string().optional(),
        founded_year: Joi.number().optional(),
        country: Joi.string().optional(),
        state: Joi.string().optional(),
        city: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        address_line1: Joi.string().optional(),
        address_line2: Joi.string().optional(),
        google_maps_link: Joi.string().optional(),
        business_registration_number: Joi.string().optional(),
        tax_identification_number: Joi.string().optional(),
        registration_authority: Joi.string().optional(),
        business_license_document: Joi.string().optional(),
        company_type: Joi.string().optional(),
        representative_name: Joi.string().optional(),
        representative_designation: Joi.string().optional(),
        representative_email: Joi.string().email().optional(),
        representative_phone: Joi.string().optional(),
        id_proof_document: Joi.string().optional(),
        linkedin_page_url: Joi.string().optional(),
        facebook_page_url: Joi.string().optional(),
        instagram_page_url: Joi.string().optional(),
        twitter_page_url: Joi.string().optional(),
        youtube_channel_url: Joi.string().optional(),
        verified_email_domain: Joi.string().optional(),
        number_of_employees: Joi.number().optional(),
        annual_revenue_range: Joi.string().optional(),
        client_list: Joi.array().items(Joi.string()).optional(),
        certifications: Joi.array().items(Joi.string()).optional(),
      }),
    ),
  )
  createPage(@Body() body: any, @Req() req: any) {
    return this.pagesService.createPage(body, req.user.id);
  }

  @Get()
  getPages(@Query() query: any, @Req() req: any) {
    return this.pagesService.getPages(query, req.user.id);
  }

  @Get(':id')
  getPageById(@Param('id') id: string, @Req() req: any) {
    return this.pagesService.getPageById(Number(id), req.user.id);
  }

  @Patch(':id')
  updatePage(
    @Param('id') id: string,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          company_name: Joi.string().optional(),
          business_name: Joi.string().allow('', null).optional(),
          company_logo: Joi.string().allow('', null).optional(),
          website_url: Joi.string().uri().allow('', null).optional(),
          official_email: Joi.string().email().allow('', null).optional(),
          official_phone: Joi.string().allow('', null).optional(),
          industry_type: Joi.string().allow('', null).optional(),
          company_description: Joi.string().allow('', null).optional(),
          founded_year: Joi.number().integer().allow(null).optional(),
          country: Joi.string().allow('', null).optional(),
          state: Joi.string().allow('', null).optional(),
          city: Joi.string().allow('', null).optional(),
          postal_code: Joi.string().allow('', null).optional(),
          address_line1: Joi.string().allow('', null).optional(),
          address_line2: Joi.string().allow('', null).optional(),
          google_maps_link: Joi.string().allow('', null).optional(),
          business_registration_number: Joi.string().allow('', null).optional(),
          tax_identification_number: Joi.string().allow('', null).optional(),
          registration_authority: Joi.string().allow('', null).optional(),
          business_license_document: Joi.string().allow('', null).optional(),
          company_type: Joi.string().allow('', null).optional(),
          representative_name: Joi.string().allow('', null).optional(),
          representative_designation: Joi.string().allow('', null).optional(),
          representative_email: Joi.string().email().allow('', null).optional(),
          representative_phone: Joi.string().allow('', null).optional(),
          id_proof_document: Joi.string().allow('', null).optional(),
          linkedin_page_url: Joi.string().allow('', null).optional(),
          facebook_page_url: Joi.string().allow('', null).optional(),
          instagram_page_url: Joi.string().allow('', null).optional(),
          twitter_page_url: Joi.string().allow('', null).optional(),
          youtube_channel_url: Joi.string().allow('', null).optional(),
          verified_email_domain: Joi.string().allow('', null).optional(),
          number_of_employees: Joi.number().integer().allow(null).optional(),
          annual_revenue_range: Joi.string().allow('', null).optional(),
          client_list: Joi.array().items(Joi.string()).allow(null).optional(),
          certifications: Joi.array().items(Joi.string()).allow(null).optional(),
        }),
      ),
    )
    body: any,
    @Req() req: any,
  ) {
    return this.pagesService.updatePage(Number(id), body, req.user.id);
  }

  @Delete(':id')
  deletePage(@Param('id') id: string, @Req() req: any) {
    return this.pagesService.deletePage(Number(id), req.user.id);
  }

  @Post(':pageId/members')
  // @UsePipes(
  //   new JoiValidationPipe(
  //     Joi.object({
  //       userId: Joi.number().required(),
  //       role: Joi.string().valid('admin', 'editor').required(),
  //     }),
  //   ),
  // )
  addMember(
    @Param('pageId') pageId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.pagesService.addMember(
      Number(pageId),
      body.userId,
      body.role,
      req.user.id,
    );
  }

  @Delete(':pageId/members/:userId')
  removeMember(
    @Param('pageId') pageId: string,
    @Param('userId') memberId: string,
    @Req() req: any,
  ) {
    return this.pagesService.removeMember(
      Number(pageId),
      Number(memberId),
      req.user.id,
    );
  }

  @Patch(':pageId/members/:userId/role')
  changeMemberRole(
    @Param('pageId') pageId: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.pagesService.changeMemberRole(
      Number(pageId),
      Number(userId),
      body.role,
      req.user.id,
    );
  }
}
