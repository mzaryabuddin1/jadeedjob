import { User } from './entities/user.entity';
export type VerificationRequirements = {
    status: 'incomplete' | 'pending_review' | 'rejected' | 'verified';
    missing: Array<{
        key: 'phone_otp' | 'id_documents' | 'kyc_approval';
        label: string;
        fields: string[];
    }>;
    completed: string[];
    canSubmitForReview: boolean;
};
export declare function computeUserIsVerified(user: Pick<User, 'phoneVerifiedAt' | 'id_document_front' | 'id_document_back' | 'kyc_status'>): boolean;
export declare function buildVerificationRequirements(user: Pick<User, 'phoneVerifiedAt' | 'id_document_front' | 'id_document_back' | 'kyc_status' | 'rejection_reason'>): VerificationRequirements;
