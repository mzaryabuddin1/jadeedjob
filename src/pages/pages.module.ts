import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyPage } from './entities/company-page.entity';
import { PageMember } from './entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyBranch } from './entities/company-branch.entity';
import { EmployerCompanyController } from './employer-company.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyPage, PageMember, User, CompanyBranch]),
  ],
  controllers: [PagesController, EmployerCompanyController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
