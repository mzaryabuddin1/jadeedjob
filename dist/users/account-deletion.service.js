"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountDeletionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const auth_session_service_1 = require("../auth/auth-session.service");
const auth_session_entity_1 = require("../auth/entities/auth-session.entity");
const otp_service_1 = require("../otp/otp.service");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const profile_block_entity_1 = require("../profiles/entities/profile-block.entity");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const push_service_1 = require("../push/push.service");
const stored_asset_entity_1 = require("../storage/entities/stored-asset.entity");
const object_storage_service_1 = require("../storage/object-storage.service");
const twilio_service_1 = require("../twilio/twilio.service");
const user_entity_1 = require("./entities/user.entity");
const account_deletion_request_entity_1 = require("./entities/account-deletion-request.entity");
const users_service_1 = require("./users.service");
let AccountDeletionService = class AccountDeletionService {
    constructor(userRepo, deletionRepo, companyRepo, sessionRepo, followRepo, blockRepo, assetRepo, otpService, twilioService, authSessionService, pushService, storageService, usersService) {
        this.userRepo = userRepo;
        this.deletionRepo = deletionRepo;
        this.companyRepo = companyRepo;
        this.sessionRepo = sessionRepo;
        this.followRepo = followRepo;
        this.blockRepo = blockRepo;
        this.assetRepo = assetRepo;
        this.otpService = otpService;
        this.twilioService = twilioService;
        this.authSessionService = authSessionService;
        this.pushService = pushService;
        this.storageService = storageService;
        this.usersService = usersService;
        this.finalizerRunning = false;
    }
    async sendDeletionOtp(userId) {
        const user = await this.requireUser(userId);
        const { otp } = await this.otpService.createOtp({
            purpose: 'account-deletion',
            target: user.phone,
            userId,
        });
        await this.deliverOtp(user.phone, otp, 'account deletion');
        return this.otpService.otpResponse(`OTP sent to ${user.phone}`, otp);
    }
    async confirmDeletion(userId, otp) {
        const user = await this.requireUser(userId);
        await this.otpService.verifyOtp({
            purpose: 'account-deletion',
            target: user.phone,
            userId,
            otp,
        });
        const blockers = await this.companyRepo.find({
            where: { ownerId: userId },
            select: ['id', 'company_name'],
        });
        if (blockers.length) {
            throw new common_1.ConflictException({
                code: 'ACCOUNT_DELETION_BLOCKED',
                message: 'Transfer ownership of these companies before deleting the account',
                details: {
                    companies: blockers.map((company) => ({
                        companyId: company.id,
                        name: company.company_name,
                        reason: 'sole_owner',
                    })),
                },
            });
        }
        const scheduledDeletionAt = new Date(Date.now() +
            Number(process.env.ACCOUNT_DELETION_GRACE_DAYS || 30) *
                24 *
                60 *
                60 *
                1000);
        await this.userRepo.manager.transaction(async (manager) => {
            user.deletionScheduledAt = scheduledDeletionAt;
            user.tokenVersion = Number(user.tokenVersion || 0) + 1;
            await manager.save(user);
            await manager.getRepository(account_deletion_request_entity_1.AccountDeletionRequest).save(manager.getRepository(account_deletion_request_entity_1.AccountDeletionRequest).create({
                userId,
                status: 'scheduled',
                scheduledDeletionAt,
                blockerSnapshot: {},
            }));
            await manager.getRepository(auth_session_entity_1.AuthSession).update({ userId }, { revokedAt: new Date(), revokedReason: 'account_deletion' });
        });
        await this.pushService.removeAllForUser(userId);
        return { scheduledDeletionAt };
    }
    async sendRecoveryOtp(phone) {
        const user = await this.userRepo.findOne({ where: { phone } });
        if (user?.deletionScheduledAt && !user.deletedAt) {
            const { otp } = await this.otpService.createOtp({
                purpose: 'account-recovery',
                target: phone,
                userId: user.id,
            });
            await this.deliverOtp(phone, otp, 'account recovery');
            return this.otpService.otpResponse(`OTP sent to ${phone}`, otp);
        }
        return { message: `If recovery is available, an OTP was sent to ${phone}` };
    }
    async confirmRecovery(phone, otp, device) {
        const user = await this.userRepo.findOne({ where: { phone } });
        if (!user?.deletionScheduledAt || user.deletedAt) {
            throw new common_1.NotFoundException('Recoverable account not found');
        }
        await this.otpService.verifyOtp({
            purpose: 'account-recovery',
            target: phone,
            userId: user.id,
            otp,
        });
        user.deletionScheduledAt = null;
        user.tokenVersion = Number(user.tokenVersion || 0) + 1;
        await this.userRepo.save(user);
        await this.deletionRepo.update({ userId: user.id, status: 'scheduled' }, { status: 'recovered', recoveredAt: new Date() });
        await this.authSessionService.revokeAllForUser(user.id, 'account_recovered');
        const session = await this.authSessionService.createSession(user, device);
        const { userId: _userId, ...tokens } = session;
        const profile = await this.usersService.getMyProfileResponse(user.id);
        return { ...tokens, profile: profile.user, ...profile };
    }
    async finalizeScheduledAccounts() {
        if (this.finalizerRunning)
            return;
        this.finalizerRunning = true;
        try {
            const requests = await this.deletionRepo.find({
                where: {
                    status: 'scheduled',
                    scheduledDeletionAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
                },
                take: 25,
                order: { scheduledDeletionAt: 'ASC' },
            });
            for (const request of requests) {
                await this.finalizeOne(request);
            }
        }
        finally {
            this.finalizerRunning = false;
        }
    }
    async finalizeOne(request) {
        const user = await this.userRepo.findOne({ where: { id: request.userId } });
        if (!user || user.deletedAt || !user.deletionScheduledAt) {
            request.status = user?.deletedAt ? 'completed' : 'cancelled';
            await this.deletionRepo.save(request);
            return;
        }
        if (await this.companyRepo.count({ where: { ownerId: user.id } }))
            return;
        const removableAssets = await this.assetRepo.find({
            where: { ownerUserId: user.id },
        });
        for (const asset of removableAssets) {
            if (!asset.purpose.startsWith('company') &&
                !asset.purpose.startsWith('support') &&
                !asset.purpose.startsWith('chat')) {
                await this.storageService.remove(asset).catch(() => undefined);
            }
        }
        await this.userRepo.manager.transaction(async (manager) => {
            await manager.getRepository(profile_follow_entity_1.ProfileFollow).delete([
                { followerUserId: user.id },
                { profileType: 'user', profileId: user.id },
            ]);
            await manager.getRepository(profile_block_entity_1.ProfileBlock).delete([
                { blockerUserId: user.id },
                { profileType: 'user', profileId: user.id },
            ]);
            await manager.getRepository(auth_session_entity_1.AuthSession).delete({ userId: user.id });
            Object.assign(user, {
                email: null,
                phone: `deleted:${user.id}:${(0, crypto_1.randomUUID)()}`,
                firstName: 'Deleted',
                lastName: 'User',
                full_name: 'Deleted User',
                passwordHash: null,
                passwordSalt: null,
                profile_photo: null,
                alternate_phone: null,
                address_line1: null,
                address_line2: null,
                city: null,
                state: null,
                postal_code: null,
                contact_country: null,
                latitude: null,
                longitude: null,
                national_id_number: null,
                passport_number: null,
                id_document_front: null,
                id_document_back: null,
                address_proof_document: null,
                bank_name: null,
                branch_name: null,
                account_number: null,
                iban: null,
                swift_code: null,
                professional_summary: null,
                skills: null,
                technical_skills: null,
                soft_skills: null,
                linkedin_url: null,
                github_url: null,
                portfolio_url: null,
                behance_url: null,
                deletionScheduledAt: null,
                deletedAt: new Date(),
                isBanned: true,
                tokenVersion: Number(user.tokenVersion || 0) + 1,
            });
            await manager.save(user);
            request.status = 'completed';
            request.completedAt = new Date();
            await manager.save(request);
        });
        await this.pushService.removeAllForUser(user.id);
    }
    async requireUser(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async deliverOtp(phone, otp, purpose) {
        if (!process.env.TWILIO_ACCOUNT_SID ||
            !process.env.TWILIO_AUTH_TOKEN ||
            !process.env.TWILIO_PHONE_NUMBER) {
            return;
        }
        await this.twilioService.sendSms(phone, `Your JobsLoot ${purpose} OTP is ${otp}. It expires in 5 minutes.`);
    }
};
exports.AccountDeletionService = AccountDeletionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountDeletionService.prototype, "finalizeScheduledAccounts", null);
exports.AccountDeletionService = AccountDeletionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(account_deletion_request_entity_1.AccountDeletionRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __param(3, (0, typeorm_1.InjectRepository)(auth_session_entity_1.AuthSession)),
    __param(4, (0, typeorm_1.InjectRepository)(profile_follow_entity_1.ProfileFollow)),
    __param(5, (0, typeorm_1.InjectRepository)(profile_block_entity_1.ProfileBlock)),
    __param(6, (0, typeorm_1.InjectRepository)(stored_asset_entity_1.StoredAsset)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        otp_service_1.OtpService,
        twilio_service_1.TwilioService,
        auth_session_service_1.AuthSessionService,
        push_service_1.PushService,
        object_storage_service_1.ObjectStorageService,
        users_service_1.UsersService])
], AccountDeletionService);
//# sourceMappingURL=account-deletion.service.js.map