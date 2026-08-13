import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityGuidelinesGuard } from './community-guidelines.guard';
import { LegalController, UserLegalAcceptancesController } from './legal.controller';
import { LegalDocument } from './entities/legal-document.entity';
import { UserLegalAcceptance } from './entities/user-legal-acceptance.entity';
import { LegalService } from './legal.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LegalDocument, UserLegalAcceptance])],
  controllers: [LegalController, UserLegalAcceptancesController],
  providers: [LegalService, CommunityGuidelinesGuard],
  exports: [LegalService, CommunityGuidelinesGuard],
})
export class LegalModule {}
