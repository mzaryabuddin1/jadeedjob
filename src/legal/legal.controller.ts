import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { LegalService } from './legal.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  LegalDocumentDto,
  SubmitLegalAcceptancesDto,
  UserLegalAcceptanceDto,
} from './dto/legal-api.dto';

const acceptanceSchema = Joi.object({
  acceptances: Joi.array()
    .items(
      Joi.object({
        documentType: Joi.string()
          .valid('terms', 'privacy', 'community_guidelines')
          .required(),
        version: Joi.string().trim().min(1).max(80).required(),
      }),
    )
    .min(1)
    .max(3)
    .required(),
  clientPlatform: Joi.string()
    .valid('ios', 'android', 'web', 'unknown')
    .required(),
});

@Controller('legal')
@ApiTags('Legal')
@ApiExtraModels(LegalDocumentDto, UserLegalAcceptanceDto)
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('current')
  @ApiOperation({ summary: 'List current published legal documents' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
      },
    },
  })
  current() {
    return this.legalService.getCurrentDocuments();
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users/me/legal-acceptances')
@ApiTags('Legal')
@ApiBearerAuth()
@ApiExtraModels(LegalDocumentDto, UserLegalAcceptanceDto)
export class UserLegalAcceptancesController {
  constructor(private readonly legalService: LegalService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user legal acceptances' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/UserLegalAcceptanceDto' } },
        current: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
        missingCurrent: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  list(@Req() req: any) {
    return this.legalService.getUserAcceptances(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Accept current legal document versions' })
  @ApiBody({ type: SubmitLegalAcceptancesDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/UserLegalAcceptanceDto' } },
        current: { type: 'array', items: { $ref: '#/components/schemas/LegalDocumentDto' } },
        missingCurrent: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  accept(
    @Req() req: any,
    @Body(new JoiValidationPipe(acceptanceSchema)) body: any,
  ) {
    return this.legalService.acceptDocuments(
      req.user.id,
      body.acceptances,
      body.clientPlatform,
    );
  }
}
