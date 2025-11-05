import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';

@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /**
   * POST /pages
   * Create a new company page
   */
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

        // Address
        country: Joi.string().optional(),
        state: Joi.string().optional(),
        city: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        address_line1: Joi.string().optional(),
        address_line2: Joi.string().optional(),
        google_maps_link: Joi.string().optional(),

        // Legal
        business_registration_number: Joi.string().optional(),
        tax_identification_number: Joi.string().optional(),
        registration_authority: Joi.string().optional(),
        business_license_document: Joi.string().optional(),
        company_type: Joi.string().optional(),

        // Representative Info
        representative_name: Joi.string().optional(),
        representative_designation: Joi.string().optional(),
        representative_email: Joi.string().email().optional(),
        representative_phone: Joi.string().optional(),
        id_proof_document: Joi.string().optional(),

        // Digital Presence
        linkedin_page_url: Joi.string().optional(),
        facebook_page_url: Joi.string().optional(),
        instagram_page_url: Joi.string().optional(),
        twitter_page_url: Joi.string().optional(),
        youtube_channel_url: Joi.string().optional(),
        verified_email_domain: Joi.string().optional(),

        // Optional Trust Metrics
        number_of_employees: Joi.number().optional(),
        annual_revenue_range: Joi.string().optional(),
        client_list: Joi.array().items(Joi.string()).optional(),
        certifications: Joi.array().items(Joi.string()).optional(),
        company_rating: Joi.number().optional(),
      }),
    ),
  )
  async createPage(@Body() body: any, @Req() req: any) {
    return this.pagesService.createPage(body, req.user.id);
  }

  /**
   * GET /pages
   * Get all company pages (with pagination and search)
   */
  @Get()
  async getPages(@Query() query: any, @Req() req: any) {
    return this.pagesService.getPages(query, req.user.id);
  }

  /**
   * GET /pages/:id
   * Get a single company page by ID
   */
  @Get(':id')
  async getPageById(@Param('id') id: string) {
    return this.pagesService.getPageById(id);
  }

  /**
   * PUT /pages/:id
   * Update a company page (only by the owner)
   */
  @Put(':id')
  async updatePage(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.pagesService.updatePage(id, body, req.user.id);
  }

  /**
   * DELETE /pages/:id
   * Delete a company page (only by the owner)
   */
  @Delete(':id')
  async deletePage(@Param('id') id: string, @Req() req: any) {
    return this.pagesService.deletePage(id, req.user.id);
  }
}
