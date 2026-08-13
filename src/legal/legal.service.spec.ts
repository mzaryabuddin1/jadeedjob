import { HttpStatus } from '@nestjs/common';
import { LegalService } from './legal.service';

const document = (overrides: Record<string, any> = {}) => ({
  id: 1,
  documentType: 'community_guidelines',
  version: 'cg-1',
  title: 'Guidelines',
  contentUrl: 'https://example.test/guidelines',
  effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: new Date('2025-12-01T00:00:00.000Z'),
  isCurrent: true,
  ...overrides,
});

describe('LegalService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LEGAL_REGISTRATION_ENFORCEMENT_ENABLED;
    delete process.env.LEGAL_REGISTRATION_ENFORCEMENT_AT;
    delete process.env.LEGAL_COMMUNITY_ENFORCEMENT_ENABLED;
    delete process.env.LEGAL_COMMUNITY_ENFORCEMENT_AT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const setup = (overrides: Record<string, any> = {}) => {
    const documentRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      ...overrides.documentRepo,
    };
    const acceptanceRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => ({})),
      })),
      ...overrides.acceptanceRepo,
    };
    return {
      service: new LegalService(documentRepo as any, acceptanceRepo as any),
      documentRepo,
      acceptanceRepo,
    };
  };

  it('does not enforce when disabled, scheduled in the future, or unpublished', async () => {
    const { service, documentRepo } = setup();
    await expect(service.validateRegistrationAcceptances(undefined)).resolves.toBeUndefined();

    process.env.LEGAL_REGISTRATION_ENFORCEMENT_ENABLED = 'true';
    process.env.LEGAL_REGISTRATION_ENFORCEMENT_AT = '2999-01-01T00:00:00.000Z';
    await expect(service.validateRegistrationAcceptances(undefined)).resolves.toBeUndefined();

    process.env.LEGAL_REGISTRATION_ENFORCEMENT_AT = '2020-01-01T00:00:00.000Z';
    documentRepo.find.mockResolvedValue([
      document({ documentType: 'terms' }),
    ]);
    await expect(service.validateRegistrationAcceptances(undefined)).resolves.toBeUndefined();
  });

  it('requires the exact current Terms and Privacy versions after activation', async () => {
    process.env.LEGAL_REGISTRATION_ENFORCEMENT_ENABLED = 'true';
    process.env.LEGAL_REGISTRATION_ENFORCEMENT_AT = '2020-01-01T00:00:00.000Z';
    const current = [
      document({ id: 2, documentType: 'terms', version: 'terms-2' }),
      document({ id: 3, documentType: 'privacy', version: 'privacy-4' }),
    ];
    const { service } = setup({
      documentRepo: {
        find: jest.fn(async () => current),
      },
    });

    await expect(
      service.validateRegistrationAcceptances([
        { documentType: 'terms', version: 'terms-2' },
      ]),
    ).rejects.toMatchObject({ status: HttpStatus.PRECONDITION_REQUIRED });

    await expect(
      service.validateRegistrationAcceptances([
        { documentType: 'terms', version: 'terms-2' },
        { documentType: 'privacy', version: 'privacy-4' },
      ]),
    ).resolves.toBeUndefined();
  });

  it('requires current Guidelines acceptance only after activation', async () => {
    process.env.LEGAL_COMMUNITY_ENFORCEMENT_ENABLED = 'true';
    process.env.LEGAL_COMMUNITY_ENFORCEMENT_AT = '2020-01-01T00:00:00.000Z';
    const guidelines = document();
    const { service, acceptanceRepo } = setup({
      documentRepo: { findOne: jest.fn(async () => guidelines) },
    });

    await expect(service.assertCommunityAccepted(7)).rejects.toMatchObject({
      status: HttpStatus.PRECONDITION_REQUIRED,
    });
    acceptanceRepo.findOne.mockResolvedValue({ id: 9 });
    await expect(service.assertCommunityAccepted(7)).resolves.toBeUndefined();
  });
});
