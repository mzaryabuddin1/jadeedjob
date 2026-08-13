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
const api_exception_1 = require("../common/errors/api-exception");
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
        const existing = await this.activeDeletionRequest(user.id);
        if (existing)
            return this.scheduledResponse(existing.scheduledDeletionAt);
        await this.otpService.verifyOtp({
            purpose: 'account-deletion',
            target: user.phone,
            userId,
            otp,
        });
        return this.scheduleDeletion(user);
    }
    async sendPublicDeletionOtp(phone) {
        const normalized = String(phone || '').trim();
        const user = await this.userRepo.findOne({ where: { phone: normalized } });
        if (user && !user.deletedAt && !user.deletionScheduledAt) {
            try {
                const { otp } = await this.otpService.createOtp({
                    purpose: 'account-deletion',
                    target: normalized,
                    userId: user.id,
                    metadata: { source: 'public-account-deletion' },
                });
                await this.deliverOtp(normalized, otp, 'account deletion');
            }
            catch {
            }
        }
        return {
            message: 'If the account is eligible, an OTP has been sent.',
        };
    }
    async confirmPublicDeletion(phone, otp) {
        const normalized = String(phone || '').trim();
        const user = await this.userRepo.findOne({ where: { phone: normalized } });
        if (!user || user.deletedAt)
            throw this.publicDeletionOtpInvalid();
        try {
            await this.otpService.verifyOtp({
                purpose: 'account-deletion',
                target: normalized,
                userId: user.id,
                otp,
            });
        }
        catch {
            const replay = await this.otpService.wasRecentlyUsed({
                purpose: 'account-deletion',
                target: normalized,
                userId: user.id,
                otp,
            });
            if (!replay)
                throw this.publicDeletionOtpInvalid();
        }
        const existing = await this.activeDeletionRequest(user.id);
        if (existing)
            return this.scheduledResponse(existing.scheduledDeletionAt);
        try {
            return await this.scheduleDeletion(user);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                const response = error.getResponse();
                if (typeof response === 'object' &&
                    response !== null &&
                    response.code === 'ACCOUNT_DELETION_BLOCKED') {
                    return {
                        status: 'blocked',
                        code: 'ACCOUNT_DELETION_BLOCKED',
                        message: response.message,
                        details: response.details,
                    };
                }
            }
            throw error;
        }
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
        await this.deletionRepo.update({ userId: user.id, status: 'scheduled' }, {
            status: 'recovered',
            recoveredAt: new Date(),
            activeKey: null,
            processingClaimToken: null,
            processingClaimedAt: null,
        });
        await this.authSessionService.revokeAllForUser(user.id, 'account_recovered');
        const session = await this.authSessionService.createSession(user, device);
        const { userId: _userId, ...tokens } = session;
        const profile = await this.usersService.getMyProfileResponse(user.id);
        return { ...tokens, profile: profile.user, ...profile };
    }
    async finalizeScheduledAccounts() {
        const requests = await this.deletionRepo.find({
            where: {
                status: 'scheduled',
                scheduledDeletionAt: (0, typeorm_2.LessThanOrEqual)(new Date()),
            },
            select: ['id'],
            take: 25,
            order: { scheduledDeletionAt: 'ASC' },
        });
        for (const candidate of requests) {
            const claimed = await this.claimDeletion(candidate.id);
            if (!claimed)
                continue;
            try {
                await this.finalizeOne(claimed);
            }
            catch (error) {
                await this.deletionRepo.update({ id: claimed.id, processingClaimToken: claimed.processingClaimToken }, {
                    processingClaimToken: null,
                    processingClaimedAt: null,
                    lastError: error instanceof Error
                        ? error.message.slice(0, 2000)
                        : 'Account deletion finalization failed',
                });
            }
        }
    }
    async finalizeOne(request) {
        const user = await this.userRepo.findOne({ where: { id: request.userId } });
        if (!user || user.deletedAt || !user.deletionScheduledAt) {
            request.status = user?.deletedAt ? 'completed' : 'cancelled';
            request.activeKey = null;
            request.processingClaimToken = null;
            request.processingClaimedAt = null;
            await this.deletionRepo.save(request);
            return;
        }
        if (await this.companyRepo.count({ where: { ownerId: user.id } })) {
            throw new Error('Company ownership still blocks account deletion');
        }
        const removableAssets = await this.assetRepo.find({
            where: { ownerUserId: user.id },
        });
        const companyContentAssetRows = await this.userRepo.manager.query(`
          SELECT imageAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND imageAssetId IS NOT NULL
          UNION SELECT videoAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND videoAssetId IS NOT NULL
          UNION SELECT videoThumbnailAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND videoThumbnailAssetId IS NOT NULL
          UNION SELECT videoAssetId AS assetId FROM reels
          WHERE creatorId = ? AND publisherType = 'company' AND videoAssetId IS NOT NULL
        `, [user.id, user.id, user.id, user.id]);
        const companyContentAssetIds = new Set(companyContentAssetRows.map((row) => row.assetId).filter(Boolean));
        for (const asset of removableAssets) {
            if (this.assetMustBeRetained(asset.purpose) ||
                companyContentAssetIds.has(asset.id)) {
                continue;
            }
            await this.storageService.remove(asset);
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
            await manager.query('DELETE FROM auth_identities WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM otp_records WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM push_devices WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM notifications WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM notification_preferences WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM idempotency_records WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM work_experience WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM education WHERE userId = ?', [user.id]);
            await manager.query('DELETE FROM certifications WHERE userId = ?', [user.id]);
            await manager.query("UPDATE community_posts SET deletedAt = COALESCE(deletedAt, NOW()), moderationStatus = 'removed' WHERE creatorId = ? AND publisherType = 'user'", [user.id]);
            await manager.query("UPDATE reels SET deletedAt = COALESCE(deletedAt, NOW()), status = 'deleted', moderationStatus = 'removed' WHERE creatorId = ? AND COALESCE(publisherType, 'user') = 'user'", [user.id]);
            await manager.query("UPDATE jobs SET status = 'closed', isActive = 0 WHERE createdBy = ? AND pageId IS NULL", [user.id]);
            await manager.query("UPDATE support_contact_messages SET name = 'Deleted User', phone = 'deleted' WHERE userId = ?", [user.id]);
            await manager.query('UPDATE support_tickets SET contact = NULL, preferredContact = NULL WHERE userId = ?', [user.id]);
            Object.assign(user, {
                email: null,
                phone: `deleted:${user.id}:${(0, crypto_1.randomUUID)()}`,
                firstName: 'Deleted',
                lastName: 'User',
                full_name: 'Deleted User',
                father_name: null,
                gender: null,
                date_of_birth: null,
                nationality: null,
                marital_status: null,
                passwordHash: null,
                passwordSalt: null,
                phoneVerifiedAt: null,
                referralCode: null,
                systemRole: 'user',
                isVerified: false,
                suspendedAt: null,
                suspendedUntil: null,
                suspensionReason: null,
                profile_photo: null,
                profilePhotoAssetId: null,
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
                id_expiry_date: null,
                id_document_front: null,
                idDocumentFrontAssetId: null,
                id_document_back: null,
                idDocumentBackAssetId: null,
                address_proof_document: null,
                addressProofAssetId: null,
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
                languages_spoken: null,
                filter_preferences: null,
                fcmTokens: null,
                country: null,
                language: null,
                kyc_status: 'pending',
                verified_by_admin_id: null,
                verification_date: null,
                rejection_reason: null,
                notes: null,
                admin_notes: null,
                deletionScheduledAt: null,
                deletedAt: new Date(),
                isBanned: true,
                ratingAverage: 0,
                ratingCount: 0,
                tokenVersion: Number(user.tokenVersion || 0) + 1,
            });
            await manager.save(user);
            request.status = 'completed';
            request.completedAt = new Date();
            request.activeKey = null;
            request.processingClaimToken = null;
            request.processingClaimedAt = null;
            request.lastError = null;
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
    async scheduleDeletion(user) {
        const blockers = await this.companyRepo.find({
            where: { ownerId: user.id },
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
        const response = await this.userRepo.manager.transaction(async (manager) => {
            const locked = await manager.getRepository(user_entity_1.User).findOne({
                where: { id: user.id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!locked || locked.deletedAt)
                throw this.publicDeletionOtpInvalid();
            const existing = await manager.getRepository(account_deletion_request_entity_1.AccountDeletionRequest).findOne({
                where: { userId: user.id, status: 'scheduled' },
            });
            if (existing)
                return existing.scheduledDeletionAt;
            locked.deletionScheduledAt = scheduledDeletionAt;
            locked.tokenVersion = Number(locked.tokenVersion || 0) + 1;
            await manager.save(locked);
            await manager.getRepository(account_deletion_request_entity_1.AccountDeletionRequest).save(manager.getRepository(account_deletion_request_entity_1.AccountDeletionRequest).create({
                userId: user.id,
                status: 'scheduled',
                scheduledDeletionAt,
                blockerSnapshot: {},
                activeKey: `user:${user.id}`,
                processingAttempts: 0,
            }));
            await manager.getRepository(auth_session_entity_1.AuthSession).update({ userId: user.id }, { revokedAt: new Date(), revokedReason: 'account_deletion' });
            return scheduledDeletionAt;
        });
        await this.pushService.removeAllForUser(user.id);
        return this.scheduledResponse(response);
    }
    activeDeletionRequest(userId) {
        return this.deletionRepo.findOne({
            where: { userId, status: 'scheduled' },
            order: { createdAt: 'DESC' },
        });
    }
    scheduledResponse(scheduledDeletionAt) {
        return { status: 'scheduled', scheduledDeletionAt };
    }
    publicDeletionOtpInvalid() {
        return new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'ACCOUNT_DELETION_OTP_INVALID', 'Invalid or expired account deletion OTP');
    }
    async claimDeletion(requestId) {
        const now = new Date();
        const claimToken = (0, crypto_1.randomUUID)();
        const staleBefore = new Date(now.getTime() - 30 * 60 * 1000);
        const result = await this.deletionRepo
            .createQueryBuilder()
            .update(account_deletion_request_entity_1.AccountDeletionRequest)
            .set({
            processingClaimToken: claimToken,
            processingClaimedAt: now,
            processingAttempts: () => 'processingAttempts + 1',
            lastError: null,
        })
            .where('id = :requestId', { requestId })
            .andWhere("status = 'scheduled'")
            .andWhere('(processingClaimedAt IS NULL OR processingClaimedAt <= :staleBefore)', { staleBefore })
            .execute();
        if (!result.affected)
            return null;
        return this.deletionRepo.findOne({
            where: { id: requestId, processingClaimToken: claimToken },
        });
    }
    assetMustBeRetained(purpose) {
        return ['company', 'support', 'chat', 'rating'].some((prefix) => String(purpose || '').startsWith(prefix));
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