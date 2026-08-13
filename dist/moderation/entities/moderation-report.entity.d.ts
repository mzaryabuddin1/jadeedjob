import { User } from 'src/users/entities/user.entity';
export type ModerationTargetType = 'post' | 'post_comment' | 'reel' | 'reel_comment' | 'user' | 'company' | 'chat_message' | 'job';
export type ModerationReportStatus = 'pending' | 'dismissed' | 'actioned';
export type ModerationAction = 'dismiss' | 'hide' | 'remove' | 'warn' | 'suspend' | 'ban';
export declare class ModerationReport {
    id: number;
    targetType: ModerationTargetType;
    targetId: string;
    reporterUserId: number;
    reporter: User;
    targetOwnerUserId: number | null;
    targetCompanyId: number | null;
    activeKey: string | null;
    legacySourceType: 'post_report' | 'reel_report' | null;
    legacySourceId: number | null;
    reason: string;
    details: string | null;
    targetSnapshot: Record<string, unknown> | null;
    status: ModerationReportStatus;
    action: ModerationAction | null;
    reviewedByAdminId: number | null;
    reviewer: User | null;
    resolutionNotes: string | null;
    suspensionEndsAt: Date | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
