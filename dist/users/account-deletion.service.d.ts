import { Repository } from 'typeorm';
import { AuthSessionService, SessionDeviceInput } from 'src/auth/auth-session.service';
import { AuthSession } from 'src/auth/entities/auth-session.entity';
import { OtpService } from 'src/otp/otp.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { PushService } from 'src/push/push.service';
import { StoredAsset } from 'src/storage/entities/stored-asset.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { User } from './entities/user.entity';
import { AccountDeletionRequest } from './entities/account-deletion-request.entity';
import { UsersService } from './users.service';
export declare class AccountDeletionService {
    private readonly userRepo;
    private readonly deletionRepo;
    private readonly companyRepo;
    private readonly sessionRepo;
    private readonly followRepo;
    private readonly blockRepo;
    private readonly assetRepo;
    private readonly otpService;
    private readonly twilioService;
    private readonly authSessionService;
    private readonly pushService;
    private readonly storageService;
    private readonly usersService;
    constructor(userRepo: Repository<User>, deletionRepo: Repository<AccountDeletionRequest>, companyRepo: Repository<CompanyPage>, sessionRepo: Repository<AuthSession>, followRepo: Repository<ProfileFollow>, blockRepo: Repository<ProfileBlock>, assetRepo: Repository<StoredAsset>, otpService: OtpService, twilioService: TwilioService, authSessionService: AuthSessionService, pushService: PushService, storageService: ObjectStorageService, usersService: UsersService);
    sendDeletionOtp(userId: number): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    confirmDeletion(userId: number, otp: string): Promise<{
        status: "scheduled";
        scheduledDeletionAt: Date;
    }>;
    sendPublicDeletionOtp(phone: string): Promise<{
        message: string;
    }>;
    confirmPublicDeletion(phone: string, otp: string): Promise<{
        status: "scheduled";
        scheduledDeletionAt: Date;
    } | {
        status: "blocked";
        code: string;
        message: any;
        details: any;
    }>;
    sendRecoveryOtp(phone: string): Promise<{
        message: string;
        otp: string;
    } | {
        message: string;
        otp?: undefined;
    }>;
    confirmRecovery(phone: string, otp: string, device: SessionDeviceInput): Promise<any>;
    finalizeScheduledAccounts(): Promise<void>;
    private finalizeOne;
    private requireUser;
    private scheduleDeletion;
    private activeDeletionRequest;
    private scheduledResponse;
    private publicDeletionOtpInvalid;
    private claimDeletion;
    private assetMustBeRetained;
    private deliverOtp;
}
