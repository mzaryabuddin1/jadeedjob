import {
  buildVerificationRequirements,
  computeUserIsVerified,
} from './profile-verification.util';

const baseUser = {
  phoneVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  id_document_front: null,
  idDocumentFrontAssetId: null,
  id_document_back: null,
  idDocumentBackAssetId: null,
  kyc_status: 'approved',
  rejection_reason: null,
} as any;

describe('profile verification', () => {
  it('accepts private asset references as completed ID documents', () => {
    const user = {
      ...baseUser,
      idDocumentFrontAssetId: 'front-asset',
      idDocumentBackAssetId: 'back-asset',
    };

    expect(computeUserIsVerified(user)).toBe(true);
    expect(buildVerificationRequirements(user)).toMatchObject({
      status: 'verified',
      missing: [],
      completed: ['phone_otp', 'id_documents', 'kyc_approval'],
      canSubmitForReview: true,
    });
  });

  it('keeps legacy document URLs valid during asset migration', () => {
    const user = {
      ...baseUser,
      id_document_front: 'https://legacy.example/front.jpg',
      id_document_back: 'https://legacy.example/back.jpg',
    };

    expect(computeUserIsVerified(user)).toBe(true);
    expect(buildVerificationRequirements(user).status).toBe('verified');
  });

  it('reports only the missing document side', () => {
    const user = {
      ...baseUser,
      idDocumentFrontAssetId: 'front-asset',
    };

    expect(computeUserIsVerified(user)).toBe(false);
    expect(buildVerificationRequirements(user)).toMatchObject({
      status: 'incomplete',
      missing: [
        {
          key: 'id_documents',
          fields: ['id_document_back'],
        },
      ],
      canSubmitForReview: false,
    });
  });
});
