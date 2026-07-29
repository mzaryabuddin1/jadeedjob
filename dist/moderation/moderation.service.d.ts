import { Repository } from 'typeorm';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow, ProfileType } from 'src/profiles/entities/profile-follow.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ReelReport } from 'src/reels/entities/reel-report.entity';
import { Reel } from 'src/reels/entities/reel.entity';
import { User } from 'src/users/entities/user.entity';
export declare class ModerationService {
    private readonly blockRepo;
    private readonly followRepo;
    private readonly legacyFollowRepo;
    private readonly userRepo;
    private readonly companyRepo;
    private readonly reelRepo;
    private readonly reportRepo;
    constructor(blockRepo: Repository<ProfileBlock>, followRepo: Repository<ProfileFollow>, legacyFollowRepo: Repository<ReelCreatorFollow>, userRepo: Repository<User>, companyRepo: Repository<CompanyPage>, reelRepo: Repository<Reel>, reportRepo: Repository<ReelReport>);
    parseProfileType(value: string): ProfileType;
    block(blockerUserId: number, profileTypeValue: string, profileId: number): Promise<{
        profileType: ProfileType;
        profileId: string;
        blocked: boolean;
    }>;
    unblock(blockerUserId: number, profileTypeValue: string, profileId: number): Promise<{
        profileType: ProfileType;
        profileId: string;
        blocked: boolean;
    }>;
    listBlocked(userId: number, page?: number, limit?: number): Promise<{
        data: ({
            blockedAt: Date;
            type: "user";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        } | {
            blockedAt: Date;
            type: "company";
            id: string;
            name: string;
            handle: string;
            avatarUri: string;
            verified: boolean;
        })[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    isInteractionBlocked(viewerId: number, targetType: ProfileType, targetId: number): Promise<boolean>;
    assertInteractionAllowed(viewerId: number, targetType: ProfileType, targetId: number): Promise<void>;
    blockedTargets(userId: number): Promise<{
        userIds: number[];
        companyIds: number[];
    }>;
    reportReel(reelId: number, reporterUserId: number, body: {
        reason: ReelReport['reason'];
        details?: string;
    }): Promise<{
        reportId: number;
        status: "pending" | "reviewed" | "dismissed" | "actioned";
    }>;
    listReelReports(status?: string, page?: number, limit?: number): Promise<{
        data: ReelReport[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    resolveReelReport(reportId: number, adminId: number, status: ReelReport['status'], resolutionNote?: string): Promise<ReelReport>;
    private assertTargetExists;
}
