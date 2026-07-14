"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeUserIsVerified = computeUserIsVerified;
exports.buildVerificationRequirements = buildVerificationRequirements;
function computeUserIsVerified(user) {
    return Boolean(user.phoneVerifiedAt) &&
        Boolean(user.id_document_front) &&
        Boolean(user.id_document_back) &&
        user.kyc_status === 'approved';
}
function buildVerificationRequirements(user) {
    const missing = [];
    const completed = [];
    if (user.phoneVerifiedAt) {
        completed.push('phone_otp');
    }
    else {
        missing.push({
            key: 'phone_otp',
            label: 'Verify phone number',
            fields: ['phoneVerifiedAt'],
        });
    }
    const documentMissingFields = [
        !user.id_document_front ? 'id_document_front' : null,
        !user.id_document_back ? 'id_document_back' : null,
    ].filter((field) => Boolean(field));
    if (documentMissingFields.length) {
        missing.push({
            key: 'id_documents',
            label: 'Upload front and back of ID',
            fields: documentMissingFields,
        });
    }
    else {
        completed.push('id_documents');
    }
    if (user.kyc_status === 'approved') {
        completed.push('kyc_approval');
    }
    else if (user.kyc_status === 'rejected') {
        missing.push({
            key: 'kyc_approval',
            label: user.rejection_reason || 'Document approval was rejected',
            fields: ['kyc_status'],
        });
    }
    else {
        missing.push({
            key: 'kyc_approval',
            label: 'Wait for document approval',
            fields: ['kyc_status'],
        });
    }
    const hasPhone = Boolean(user.phoneVerifiedAt);
    const hasDocuments = Boolean(user.id_document_front && user.id_document_back);
    const canSubmitForReview = hasPhone && hasDocuments;
    let status = 'incomplete';
    if (computeUserIsVerified(user)) {
        status = 'verified';
    }
    else if (user.kyc_status === 'rejected') {
        status = 'rejected';
    }
    else if (canSubmitForReview) {
        status = 'pending_review';
    }
    return {
        status,
        missing,
        completed,
        canSubmitForReview,
    };
}
//# sourceMappingURL=profile-verification.util.js.map