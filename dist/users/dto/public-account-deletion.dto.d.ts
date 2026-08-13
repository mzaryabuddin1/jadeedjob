export declare class PublicAccountDeletionSendOtpDto {
    phone: string;
}
export declare class PublicAccountDeletionConfirmDto extends PublicAccountDeletionSendOtpDto {
    otp: string;
}
export declare class ScheduledAccountDeletionDto {
    status: 'scheduled';
    scheduledDeletionAt: string;
    blockers?: Record<string, unknown>[];
}
export declare class BlockedAccountDeletionDto {
    status: 'blocked';
    code: 'ACCOUNT_DELETION_BLOCKED';
    message: string;
    details: {
        companies: Array<{
            companyId: number;
            name: string;
            reason: 'sole_owner';
        }>;
    };
}
