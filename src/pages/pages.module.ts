import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyBranch } from './entities/company-branch.entity';
import { EmployerCompanyController } from './employer-company.controller';
import { AdminCompanyController } from './admin-company.controller';
import { CompanyAccessRequest } from './entities/company-access-request.entity';
import { CompanyVerificationReview } from './entities/company-verification-review.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyPage,
      PageMember,
      User,
      CompanyBranch,
      CompanyAccessRequest,
      CompanyVerificationReview,
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [
    PagesController,
    EmployerCompanyController,
    AdminCompanyController,
  ],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
