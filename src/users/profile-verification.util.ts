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

export function computeUserIsVerified(user: Pick<
  User,
  'phoneVerifiedAt' | 'id_document_front' | 'id_document_back' | 'kyc_status'
>) {
  return Boolean(user.phoneVerifiedAt) &&
    Boolean(user.id_document_front) &&
    Boolean(user.id_document_back) &&
    user.kyc_status === 'approved';
}

export function buildVerificationRequirements(user: Pick<
  User,
  | 'phoneVerifiedAt'
  | 'id_document_front'
  | 'id_document_back'
  | 'kyc_status'
  | 'rejection_reason'
>): VerificationRequirements {
  const missing: VerificationRequirements['missing'] = [];
  const completed: string[] = [];

  if (user.phoneVerifiedAt) {
    completed.push('phone_otp');
  } else {
    missing.push({
      key: 'phone_otp',
      label: 'Verify phone number',
      fields: ['phoneVerifiedAt'],
    });
  }

  const documentMissingFields = [
    !user.id_document_front ? 'id_document_front' : null,
    !user.id_document_back ? 'id_document_back' : null,
  ].filter((field): field is string => Boolean(field));

  if (documentMissingFields.length) {
    missing.push({
      key: 'id_documents',
      label: 'Upload front and back of ID',
      fields: documentMissingFields,
    });
  } else {
    completed.push('id_documents');
  }

  if (user.kyc_status === 'approved') {
    completed.push('kyc_approval');
  } else if (user.kyc_status === 'rejected') {
    missing.push({
      key: 'kyc_approval',
      label: user.rejection_reason || 'Document approval was rejected',
      fields: ['kyc_status'],
    });
  } else {
    missing.push({
      key: 'kyc_approval',
      label: 'Wait for document approval',
      fields: ['kyc_status'],
    });
  }

  const hasPhone = Boolean(user.phoneVerifiedAt);
  const hasDocuments = Boolean(user.id_document_front && user.id_document_back);
  const canSubmitForReview = hasPhone && hasDocuments;

  let status: VerificationRequirements['status'] = 'incomplete';
  if (computeUserIsVerified(user as any)) {
    status = 'verified';
  } else if (user.kyc_status === 'rejected') {
    status = 'rejected';
  } else if (canSubmitForReview) {
    status = 'pending_review';
  }

  return {
    status,
    missing,
    completed,
    canSubmitForReview,
  };
}
