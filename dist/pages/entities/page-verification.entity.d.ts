import { Page } from './page.entity';
export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected';
export declare const VERIFICATION_DOC_TYPES: readonly ["business_license", "registration_certificate", "tax_document", "id_proof", "utility_bill", "other"];
export type VerificationDocType = (typeof VERIFICATION_DOC_TYPES)[number];
export type VerificationDocument = {
    type: VerificationDocType;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
};
export declare class PageVerificationRequest {
    id: number;
    pageId: number;
    page: Page;
    submittedBy: number;
    documents: VerificationDocument[];
    notes: string | null;
    status: VerificationRequestStatus;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}
