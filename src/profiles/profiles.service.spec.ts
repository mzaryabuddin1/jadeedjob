import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

const createRepo = (overrides: Record<string, any> = {}) => ({
  findOne: jest.fn(async () => null),
  count: jest.fn(async () => 0),
  delete: jest.fn(),
  manager: { transaction: jest.fn() },
  ...overrides,
});

const createQueryBuilder = (data: any[] = [], total = data.length) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(async () => [data, total]),
});

const createService = (overrides: Record<string, any> = {}) => {
  const repos = {
    followRepo: createRepo(),
    legacyFollowRepo: createRepo(),
    userRepo: createRepo(),
    pageRepo: createRepo(),
    moderationService: {
      assertInteractionAllowed: jest.fn(),
      blockedTargets: jest.fn(async () => ({ userIds: [], companyIds: [] })),
    },
    storageService: {
      getUrl: jest.fn(async () => null),
    },
    notificationsService: {
      create: jest.fn(async () => ({})),
    },
    ...overrides,
  };

  return {
    service: new ProfilesService(
      repos.followRepo as any,
      repos.legacyFollowRepo as any,
      repos.userRepo as any,
      repos.pageRepo as any,
      repos.moderationService as any,
      repos.storageService as any,
      repos.notificationsService as any,
    ),
    repos,
  };
};

describe('ProfilesService', () => {
  it('searches users case-insensitively and returns only public-safe fields', async () => {
    const queryBuilder = createQueryBuilder(
      [
        {
          id: 7,
          firstName: 'Aarav',
          lastName: 'Sharma',
          full_name: 'Aarav Sharma',
          phone: '03162394467',
          email: 'private@example.com',
          national_id_number: 'private-id',
          iban: 'private-iban',
          profile_photo: '/profiles/aarav.jpg',
          isVerified: true,
          city: 'Karachi',
          state: 'Sindh',
          country: { name: 'Pakistan' },
          work_experience: [
            {
              designation: 'Electrician',
              currently_working: true,
              experience_certificate: '/private/certificate.pdf',
            },
          ],
        },
      ],
      21,
    );
    const userRepo = createRepo({
      createQueryBuilder: jest.fn(() => queryBuilder),
    });
    const { service } = createService({ userRepo });

    const result = (await service.searchProfiles(
      {
        profileType: 'user',
        q: '  AARAV  ',
        page: 2,
        limit: 20,
      },
      99,
    )) as any;
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      total: 21,
      totalPages: 2,
      currentPage: 2,
      data: [
        {
          type: 'user',
          id: '7',
          name: 'Aarav Sharma',
          subtitle: 'Electrician',
          location: 'Karachi, Sindh, Pakistan',
          verified: true,
        },
      ],
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.isBanned = :isBanned',
      { isBanned: false },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(COALESCE(user.full_name'),
      expect.objectContaining({
        exactQuery: 'aarav',
        prefixQuery: 'aarav%',
        containsQuery: '%aarav%',
      }),
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('CASE'),
      'searchRank',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(COALESCE'),
      'searchDisplayName',
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('searchRank', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'searchDisplayName',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenLastCalledWith('user.id', 'ASC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
    expect(serialized).not.toContain('03162394467');
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('private-id');
    expect(serialized).not.toContain('private-iban');
    expect(serialized).not.toContain('certificate.pdf');
  });

  it('searches only approved companies with stable ranked ordering', async () => {
    const queryBuilder = createQueryBuilder([
      {
        id: 12,
        company_name: 'Acme Builders',
        username: 'acme-builders',
        company_logo: '/companies/acme.jpg',
        industry_type: 'Construction',
        verificationStatus: 'approved',
        city: 'Lahore',
        country: 'Pakistan',
        official_email: 'private@acme.example',
        tax_identification_number: 'private-tax-id',
        members: [{ userId: 7 }],
      },
    ]);
    const pageRepo = createRepo({
      createQueryBuilder: jest.fn(() => queryBuilder),
    });
    const { service } = createService({ pageRepo });

    const result = (await service.searchProfiles(
      {
        profileType: 'company',
        q: 'ACME',
      },
      99,
    )) as any;
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      total: 1,
      totalPages: 1,
      currentPage: 1,
      data: [
        {
          type: 'company',
          id: '12',
          name: 'Acme Builders',
          handle: '@acme-builders',
          subtitle: 'Construction',
          location: 'Lahore, Pakistan',
          verified: true,
        },
      ],
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'page.verificationStatus = :verificationStatus',
      { verificationStatus: 'approved' },
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(page.username) = :exactQuery'),
      'searchRank',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'LOWER(page.company_name)',
      'ASC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenLastCalledWith('page.id', 'ASC');
    expect(serialized).not.toContain('private@acme.example');
    expect(serialized).not.toContain('private-tax-id');
    expect(serialized).not.toContain('members');
  });

  it('escapes SQL wildcard characters and returns an empty page cleanly', async () => {
    const queryBuilder = createQueryBuilder();
    const userRepo = createRepo({
      createQueryBuilder: jest.fn(() => queryBuilder),
    });
    const { service } = createService({ userRepo });

    await expect(
      service.searchProfiles({ profileType: 'user', q: '%_!' }, 99),
    ).resolves.toEqual({
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        prefixQuery: '!%!_!!%',
        containsQuery: '%!%!_!!%',
      }),
    );
  });

  it('returns an explicit public user allowlist without private profile data', async () => {
    const userRepo = createRepo({
      findOne: jest.fn(async () => ({
        id: 7,
        firstName: 'Aarav',
        lastName: 'Sharma',
        full_name: 'Aarav Sharma',
        phone: '03162394467',
        email: 'private@example.com',
        passwordHash: 'secret',
        latitude: 24.8,
        longitude: 67.0,
        date_of_birth: '1995-08-15',
        national_id_number: 'private-id',
        id_document_front: '/private/front.jpg',
        iban: 'private-iban',
        kyc_status: 'approved',
        city: 'Karachi',
        state: 'Sindh',
        country: { name: 'Pakistan' },
        professional_summary: 'Experienced worker',
        skills: ['JavaScript'],
        technical_skills: ['NestJS'],
        soft_skills: ['Teamwork'],
        ratingAverage: 4.5,
        ratingCount: 2,
        work_experience: [
          {
            company_name: 'Example Co',
            designation: 'Worker',
            experience_certificate: '/private/certificate.pdf',
            currently_working: true,
          },
        ],
      })),
    });
    const { service } = createService({ userRepo });

    const result = (await service.getProfile('user', 7, 8)) as any;
    const serialized = JSON.stringify(result);

    expect(result.profile.name).toBe('Aarav Sharma');
    expect(result.profile.skills).toEqual(['JavaScript', 'NestJS', 'Teamwork']);
    expect(serialized).not.toContain('03162394467');
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('private-id');
    expect(serialized).not.toContain('private-iban');
    expect(serialized).not.toContain('certificate.pdf');
  });

  it('hides unapproved company profiles', async () => {
    const pageRepo = createRepo({
      findOne: jest.fn(async () => ({
        id: 12,
        verificationStatus: 'pending',
      })),
    });
    const { service } = createService({ pageRepo });

    await expect(service.getProfile('company', 12, 7)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects following the signed-in user profile', async () => {
    const userRepo = createRepo({
      findOne: jest.fn(async () => ({ id: 7, isBanned: false })),
    });
    const { service } = createService({ userRepo });

    await expect(service.follow('user', 7, 7)).rejects.toThrow(
      BadRequestException,
    );
  });
});
