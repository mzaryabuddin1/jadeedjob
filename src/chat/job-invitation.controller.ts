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

@UseGuards(JwtAuthGuard)
@Controller('job-invitations')
export class JobInvitationController {
  constructor(private readonly chatService: ChatService) {}

  @Patch(':id')
  updateInvitation(
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
    return this.chatService.updateInvitation(id, req.user.id, body.action);
  }
}
