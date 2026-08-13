import { Repository } from 'typeorm';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { CommunityPost } from 'src/posts/entities/community-post.entity';
import { PostComment } from 'src/posts/entities/post-comment.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow, ProfileType } from 'src/profiles/entities/profile-follow.entity';
import { ReelComment } from 'src/reels/entities/reel-comment.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ReelReport } from 'src/reels/entities/reel-report.entity';
import { Reel } from 'src/reels/entities/reel.entity';
import { User } from 'src/users/entities/user.entity';
import { ModerationAudit } from './entities/moderation-audit.entity';
import { ModerationAction, ModerationReport, ModerationTargetType } from './entities/moderation-report.entity';
type ReportBody = {
    reason: string;
    details?: string;
};
type ResolvedTarget = {
    targetType: ModerationTargetType;
    targetId: string;
    targetOwnerUserId?: number | null;
    targetCompanyId?: number | null;
    snapshot?: Record<string, unknown>;
};
export declare class ModerationService {
    private readonly blockRepo;
    private readonly followRepo;
    private readonly legacyFollowRepo;
    private readonly userRepo;
    private readonly companyRepo;
    private readonly pageMemberRepo;
    private readonly reelRepo;
    private readonly reelCommentRepo;
    private readonly legacyReelReportRepo;
    private readonly postRepo;
    private readonly postCommentRepo;
    private readonly chatMessageRepo;
    private readonly jobRepo;
    private readonly reportRepo;
    private readonly auditRepo;
    private readonly notificationsService;
    constructor(blockRepo: Repository<ProfileBlock>, followRepo: Repository<ProfileFollow>, legacyFollowRepo: Repository<ReelCreatorFollow>, userRepo: Repository<User>, companyRepo: Repository<CompanyPage>, pageMemberRepo: Repository<PageMember>, reelRepo: Repository<Reel>, reelCommentRepo: Repository<ReelComment>, legacyReelReportRepo: Repository<ReelReport>, postRepo: Repository<CommunityPost>, postCommentRepo: Repository<PostComment>, chatMessageRepo: Repository<ChatMessage>, jobRepo: Repository<Job>, reportRepo: Repository<ModerationReport>, auditRepo: Repository<ModerationAudit>, notificationsService: NotificationsService);
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
    reportPost(postId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportPostComment(postId: number, commentId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportReel(reelId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportReelComment(reelId: number, commentId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportProfile(profileTypeValue: string, profileId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportJob(jobId: number, reporterUserId: number, body: ReportBody): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    reportResolvedTarget(reporterUserId: number, body: ReportBody, target: ResolvedTarget): Promise<{
        reportId: string;
        status: import("./entities/moderation-report.entity").ModerationReportStatus;
        reported: boolean;
    }>;
    listReports(query: {
        status?: string;
        targetType?: ModerationTargetType;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: string;
            reportId: string;
            targetType: ModerationTargetType;
            targetId: string;
            reporterUserId: string;
            targetOwnerUserId: string;
            targetCompanyId: string;
            reason: string;
            details: string;
            targetSnapshot: Record<string, unknown>;
            legacySourceType: "post_report" | "reel_report";
            legacySourceId: string;
            status: import("./entities/moderation-report.entity").ModerationReportStatus;
            action: ModerationAction;
            reviewedByAdminId: string;
            resolutionNotes: string;
            suspensionEndsAt: Date;
            resolvedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getReport(reportId: number): Promise<{
        report: {
            id: string;
            reportId: string;
            targetType: ModerationTargetType;
            targetId: string;
            reporterUserId: string;
            targetOwnerUserId: string;
            targetCompanyId: string;
            reason: string;
            details: string;
            targetSnapshot: Record<string, unknown>;
            legacySourceType: "post_report" | "reel_report";
            legacySourceId: string;
            status: import("./entities/moderation-report.entity").ModerationReportStatus;
            action: ModerationAction;
            reviewedByAdminId: string;
            resolutionNotes: string;
            suspensionEndsAt: Date;
            resolvedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
        audits: {
            id: string;
            event: string;
            actorUserId: string;
            notes: string;
            metadata: Record<string, unknown>;
            createdAt: Date;
        }[];
    }>;
    resolveReport(reportId: number, adminId: number, body: {
        action: ModerationAction;
        notes?: string;
        suspensionEndsAt?: string | null;
    }): Promise<{
        message: string;
        report: {
            id: string;
            reportId: string;
            targetType: ModerationTargetType;
            targetId: string;
            reporterUserId: string;
            targetOwnerUserId: string;
            targetCompanyId: string;
            reason: string;
            details: string;
            targetSnapshot: Record<string, unknown>;
            legacySourceType: "post_report" | "reel_report";
            legacySourceId: string;
            status: import("./entities/moderation-report.entity").ModerationReportStatus;
            action: ModerationAction;
            reviewedByAdminId: string;
            resolutionNotes: string;
            suspensionEndsAt: Date;
            resolvedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    listReelReports(status?: string, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    resolveReelReport(reportId: number, adminId: number, status: ReelReport['status'], resolutionNote?: string): Promise<{
        message: string;
        report: {
            id: string;
            reportId: string;
            targetType: ModerationTargetType;
            targetId: string;
            reporterUserId: string;
            targetOwnerUserId: string;
            targetCompanyId: string;
            reason: string;
            details: string;
            targetSnapshot: Record<string, unknown>;
            legacySourceType: "post_report" | "reel_report";
            legacySourceId: string;
            status: import("./entities/moderation-report.entity").ModerationReportStatus;
            action: ModerationAction;
            reviewedByAdminId: string;
            resolutionNotes: string;
            suspensionEndsAt: Date;
            resolvedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    private createReport;
    private applyAction;
    private suspendTarget;
    private notifyResolution;
    private assertPublisherReportable;
    private postVisible;
    private reelVisible;
    private userHasCompanyAccess;
    private formatReport;
    private assertTargetExists;
}
export {};
