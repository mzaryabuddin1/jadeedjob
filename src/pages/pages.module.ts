import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagesController } from './pages.controller';
import { AdminPageVerificationController } from './admin-page-verification.controller';
import { PagesService } from './pages.service';
import { PageInvitationsService } from './page-invitations.service';
import { PageVerificationService } from './page-verification.service';
import { AdminKeyGuard } from './admin-key.guard';
import { Page } from './entities/page.entity';
import { PageMember } from './entities/page-member.entity';
import { PageInvitation } from './entities/page-invitation.entity';
import { PageVerificationRequest } from './entities/page-verification.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Page,
      PageMember,
      PageInvitation,
      PageVerificationRequest,
      User,
      Job,
    ]),
    NotificationModule,
  ],
  controllers: [PagesController, AdminPageVerificationController],
  providers: [
    PagesService,
    PageInvitationsService,
    PageVerificationService,
    AdminKeyGuard,
  ],
  exports: [PagesService],
})
export class PagesModule {}
