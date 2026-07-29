import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from 'src/auth/entities/auth-session.entity';
import { OtpModule } from 'src/otp/otp.module';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { StoredAsset } from 'src/storage/entities/stored-asset.entity';
import { TwilioModule } from 'src/twilio/twilio.module';
import {
  AccountDeletionController,
  AccountRecoveryController,
} from './account-deletion.controller';
import { AccountDeletionService } from './account-deletion.service';
import { AccountDeletionRequest } from './entities/account-deletion-request.entity';
import { User } from './entities/user.entity';
import { UsersModule } from './users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AccountDeletionRequest,
      CompanyPage,
      AuthSession,
      ProfileFollow,
      ProfileBlock,
      StoredAsset,
    ]),
    OtpModule,
    TwilioModule,
    UsersModule,
  ],
  controllers: [AccountDeletionController, AccountRecoveryController],
  providers: [AccountDeletionService],
})
export class AccountDeletionModule {}
