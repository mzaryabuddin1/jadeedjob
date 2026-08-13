import { ModerationService } from './moderation.service';

const repository = (overrides: Record<string, any> = {}) => ({
  findOne: jest.fn(async () => null),
  find: jest.fn(async () => []),
  findAndCount: jest.fn(async () => [[], 0]),
  findBy: jest.fn(async () => []),
  delete: jest.fn(async () => ({ affected: 0 })),
  ...overrides,
});

const createService = (overrides: Record<string, any> = {}) => {
  const reportStore: any[] = [];
  const auditStore: any[] = [];
  const reportManager = {
    transaction: jest.fn(async (operation) =>
      operation({
        getRepository: (entity: any) => ({
          create: (value: any) => value,
          save: async (value: any) => {
            if (entity.name === 'ModerationReport') {
              const created = { id: reportStore.length + 1, ...value };
              reportStore.push(created);
              return created;
            }
            auditStore.push(value);
            return value;
          },
        }),
      }),
    ),
  };
  const deps = {
    blockRepo: repository(),
    followRepo: repository(),
    legacyFollowRepo: repository(),
    userRepo: repository(),
    companyRepo: repository(),
    pageMemberRepo: repository(),
    reelRepo: repository(),
    reelCommentRepo: repository(),
    legacyReelReportRepo: repository(),
    postRepo: repository(),
    postCommentRepo: repository(),
    chatMessageRepo: repository(),
    jobRepo: repository(),
    reportRepo: repository({ manager: reportManager }),
    auditRepo: repository(),
    notificationsService: { create: jest.fn(async () => ({})) },
    ...overrides,
  };
  const service = new ModerationService(
    deps.blockRepo as any,
    deps.followRepo as any,
    deps.legacyFollowRepo as any,
    deps.userRepo as any,
    deps.companyRepo as any,
    deps.pageMemberRepo as any,
    deps.reelRepo as any,
    deps.reelCommentRepo as any,
    deps.legacyReelReportRepo as any,
    deps.postRepo as any,
    deps.postCommentRepo as any,
    deps.chatMessageRepo as any,
    deps.jobRepo as any,
    deps.reportRepo as any,
    deps.auditRepo as any,
    deps.notificationsService as any,
  );
  return { service, deps, reportStore, auditStore };
};

describe('ModerationService', () => {
  it('rejects self-reporting before inserting evidence', async () => {
    const { service, reportStore } = createService();
    await expect(
      service.reportResolvedTarget(
        7,
        { reason: 'spam' },
        { targetType: 'chat_message', targetId: '11', targetOwnerUserId: 7 },
      ),
    ).rejects.toThrow('You cannot report your own content');
    expect(reportStore).toHaveLength(0);
  });

  it('creates a canonical report and immutable reported audit', async () => {
    const { service, reportStore, auditStore } = createService();
    await expect(
      service.reportResolvedTarget(
        7,
        { reason: ' harassment ', details: ' evidence ' },
        {
          targetType: 'chat_message',
          targetId: '11',
          targetOwnerUserId: 9,
          snapshot: { conversationId: 'conversation-1' },
        },
      ),
    ).resolves.toEqual({ reportId: '1', status: 'pending', reported: true });
    expect(reportStore[0]).toMatchObject({
      reporterUserId: 7,
      targetType: 'chat_message',
      targetId: '11',
      reason: 'harassment',
      details: 'evidence',
      activeKey: '7:chat_message:11',
    });
    expect(auditStore[0]).toMatchObject({ event: 'reported', actorUserId: 7 });
  });

  it('uses a stable conflict code for duplicate active reports', async () => {
    const duplicate: any = new Error('duplicate');
    duplicate.code = 'ER_DUP_ENTRY';
    const reportRepo = repository({
      manager: { transaction: jest.fn(async () => Promise.reject(duplicate)) },
    });
    const { service } = createService({ reportRepo });
    await expect(
      service.reportResolvedTarget(
        7,
        { reason: 'spam' },
        { targetType: 'job', targetId: '4', targetOwnerUserId: 9 },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('prevents new interactions for either direction of a user block', async () => {
    const blockRepo = repository({
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ blockerUserId: 9, profileId: 7 }),
    });
    const { service } = createService({ blockRepo });
    await expect(service.assertInteractionAllowed(7, 'user', 9)).rejects.toMatchObject({
      status: 403,
    });
  });
});
