import { ModerationService } from './moderation.service';
export declare class AdminModerationController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    list(query: any): Promise<{
        data: {
            id: string;
            reportId: string;
            targetType: import("./entities/moderation-report.entity").ModerationTargetType;
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
            action: import("./entities/moderation-report.entity").ModerationAction;
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
    detail(reportId: number): Promise<{
        report: {
            id: string;
            reportId: string;
            targetType: import("./entities/moderation-report.entity").ModerationTargetType;
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
            action: import("./entities/moderation-report.entity").ModerationAction;
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
    resolve(reportId: number, req: any, body: any): Promise<{
        message: string;
        report: {
            id: string;
            reportId: string;
            targetType: import("./entities/moderation-report.entity").ModerationTargetType;
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
            action: import("./entities/moderation-report.entity").ModerationAction;
            reviewedByAdminId: string;
            resolutionNotes: string;
            suspensionEndsAt: Date;
            resolvedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
