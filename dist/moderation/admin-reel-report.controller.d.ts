import { ModerationService } from './moderation.service';
export declare class AdminReelReportController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    list(query: any): Promise<{
        data: import("../reels/entities/reel-report.entity").ReelReport[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    resolve(reportId: number, req: any, body: any): Promise<import("../reels/entities/reel-report.entity").ReelReport>;
}
