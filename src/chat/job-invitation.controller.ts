import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  InvitationProjectionDto,
  UpdateInvitationDto,
} from './dto/invitation-api.dto';

@UseGuards(JwtAuthGuard)
@Controller('job-invitations')
@ApiTags('Chat invitations')
@ApiBearerAuth()
@ApiExtraModels(InvitationProjectionDto)
export class JobInvitationController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Accept, decline, or cancel a job invitation' })
  @ApiBody({ type: UpdateInvitationDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        invitation: { $ref: '#/components/schemas/InvitationProjectionDto' },
        chatId: { type: 'string', format: 'uuid' },
        conversationId: { type: 'string', format: 'uuid' },
        applicationId: { type: 'string', nullable: true },
      },
    },
  })
  async updateInvitation(
    @Param('id') id: string,
    @Body(
      new JoiValidationPipe(
        Joi.object({
          action: Joi.string()
            .valid('accept', 'decline', 'cancel')
            .required(),
        }),
      ),
    )
    body: { action: 'accept' | 'decline' | 'cancel' },
    @Req() req: any,
  ) {
    const result = await this.chatService.updateInvitation(
      id,
      req.user.id,
      body.action,
    );
    const updates = await this.chatService.invitationRealtimePayloads(id);
    this.chatGateway.emitInvitationUpdatedForUsers(updates);
    return result;
  }
}
