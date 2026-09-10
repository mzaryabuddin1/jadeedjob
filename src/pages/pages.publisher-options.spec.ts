import { PagesService } from './pages.service';

describe('PagesService publisher options', () => {
  it('returns the user first and keeps unavailable companies with reasons', async () => {
    const pages = [
      {
        id: 1,
        ownerId: 7,
        company_name: 'Pending Owner Co',
        username: 'pending-owner',
        verificationStatus: 'pending',
        members: [],
      },
      {
        id: 2,
        ownerId: 99,
        company_name: 'Editor Co',
        username: 'editor-co',
        verificationStatus: 'approved',
        members: [
          {
            userId: 7,
            role: 'editor',
            hasAccess: true,
            permissions: { publishContent: false },
          },
        ],
      },
      {
        id: 3,
        ownerId: 99,
        company_name: 'Inactive Co',
        username: 'inactive-co',
        verificationStatus: 'approved',
        members: [
          {
            userId: 7,
            role: 'editor',
            hasAccess: false,
            permissions: { publishContent: true },
          },
        ],
      },
      {
        id: 4,
        ownerId: 99,
        company_name: 'Publishing Co',
        username: 'publishing-co',
        verificationStatus: 'approved',
        members: [
          {
            userId: 7,
            role: 'editor',
            hasAccess: true,
            permissions: { publishContent: true },
          },
        ],
      },
    ];
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => pages),
    };
    const pageRepo = { createQueryBuilder: jest.fn(() => qb) };
    const userRepo = {
      findOne: jest.fn(async () => ({
        id: 7,
        firstName: 'Aarav',
        lastName: 'Sharma',
        isVerified: true,
        profile_photo: null,
      })),
    };
    const service = new PagesService(
      pageRepo as any,
      {} as any,
      userRepo as any,
      {} as any,
      {} as any,
      {} as any,
      { getUrl: jest.fn(async () => null) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.getPublisherOptions(7, 'publishContent');

    expect(result.data[0]).toMatchObject({
      type: 'user',
      id: '7',
      canPublish: true,
    });
    expect(result.data.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          canPublish: false,
          disabledReason: 'Company verification is pending',
        }),
        expect.objectContaining({
          id: '2',
          canPublish: false,
          disabledReason: 'Publish content permission is required',
        }),
        expect.objectContaining({
          id: '3',
          canPublish: false,
          disabledReason: 'Company access is disabled',
        }),
        expect.objectContaining({ id: '4', canPublish: true }),
      ]),
    );
  });
});
