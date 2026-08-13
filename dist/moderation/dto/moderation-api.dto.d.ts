export declare class CreateModerationReportDto {
    reason: string;
    details?: string | null;
}
export declare class ResolveModerationReportDto {
    action: 'dismiss' | 'hide' | 'remove' | 'warn' | 'suspend' | 'ban';
    notes?: string | null;
    suspensionEndsAt?: string | null;
}
export declare class ModerationReportDto {
    id: string;
    targetType: string;
    targetId: string;
    status: string;
    action?: string | null;
    createdAt: string;
}
export declare class ModerationReportCreatedDto {
    reportId: string;
    status: 'pending';
    reported: true;
}
