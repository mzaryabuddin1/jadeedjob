export type OtpPurpose = 'register' | 'forgot-password' | 'phone-change' | 'password-change';
export declare class OtpRecord {
    id: number;
    purpose: OtpPurpose;
    target: string;
    userId: number;
    codeHash: string;
    expiresAt: Date;
    usedAt: Date;
    attempts: number;
    resendCount: number;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
