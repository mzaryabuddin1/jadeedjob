import { ModerationService } from './moderation.service';
export declare class AdminReelReportController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    list(query: any): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
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
