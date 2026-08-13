import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobService } from './job.service';

const createQueryBuilder = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  loadRelationCountAndMap: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
});

const createService = (page: Record<string, any> | null) => {
  const queryBuilder = createQueryBuilder();
  const jobRepo = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const pageRepo = {
    findOne: jest.fn().mockResolvedValue(page),
  };

  const service = new JobService(
    jobRepo as any,
    {} as any,
    pageRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {
      blockedTargets: jest.fn(async () => ({ userIds: [], companyIds: [] })),
      isInteractionBlocked: jest.fn(async () => false),
    } as any,
    {
      execute: jest.fn(
        async (_userId, _scope, _key, _request, operation) => operation(),
      ),
    } as any,
  );

  return { service, pageRepo, queryBuilder };
};

describe('JobService company approval', () => {
  it('blocks company job actions until the company is approved', async () => {
    const { service } = createService({
      id: 12,
      ownerId: 7,
      verificationStatus: 'pending',
      members: [],
    });

    await expect(
      (service as any).assertCompanyPermission(12, 7, 'postJobs', true),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires an active member with postJobs permission', async () => {
    const page = {
      id: 12,
      ownerId: 99,
      verificationStatus: 'approved',
      members: [
        {
          userId: 7,
          role: 'editor',
          hasAccess: true,
          permissions: { postJobs: false },
        },
      ],
    };
    const { service } = createService(page);

    await expect(
      (service as any).assertCompanyPermission(12, 7, 'postJobs', true),
    ).rejects.toThrow(ForbiddenException);

    page.members[0].permissions.postJobs = true;
    await expect(
      (service as any).assertCompanyPermission(12, 7, 'postJobs', true),
    ).resolves.toBeUndefined();
  });

  it('uses postJobs permission when moving an individual job to a company', async () => {
    const page = {
      id: 12,
      ownerId: 99,
      verificationStatus: 'approved',
      members: [
        {
          userId: 7,
          role: 'editor',
          hasAccess: true,
          permissions: { editJobs: true, postJobs: false },
        },
      ],
    };
    const { service } = createService(page);
    const individualJob = { createdBy: 7, pageId: null };

    await expect(
      (service as any).assertJobUpdateAccess(individualJob, 12, 7),
    ).rejects.toThrow(ForbiddenException);

    page.members[0].permissions.postJobs = true;
    await expect(
      (service as any).assertJobUpdateAccess(individualJob, 12, 7),
    ).resolves.toBeUndefined();
  });

  it('returns only the approved company active-job query', async () => {
    const { service, pageRepo, queryBuilder } = createService({
      id: 12,
      ownerId: 7,
      verificationStatus: 'approved',
    });

    await expect(
      service.findJobs({ companyId: 12, page: 1, limit: 8 }, 7),
    ).resolves.toMatchObject({ data: [], total: 0, currentPage: 1 });

    expect(pageRepo.findOne).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'job.isActive = :active',
      { active: true },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "COALESCE(job.status, 'active') = 'active'",
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'job.pageId = :companyId',
      { companyId: 12 },
    );
  });

  it('does not expose jobs for an unapproved company profile', async () => {
    const { service } = createService({
      id: 12,
      verificationStatus: 'rejected',
    });

    await expect(service.findJobs({ companyId: 12 }, 7)).rejects.toThrow(
      NotFoundException,
    );
  });
});
