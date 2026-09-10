import { ChatAuthorizationCacheService } from './chat-authorization-cache.service';

describe('ChatAuthorizationCacheService', () => {
  const originalEnvironment = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });

  it('caches only successful company permission decisions', async () => {
    const service = new ChatAuthorizationCacheService();
    const allow = jest.fn(async () => true);
    const deny = jest.fn(async () => false);

    await expect(
      service.getCompanyPermission(4, 8, 'chatApplicants', allow),
    ).resolves.toBe(true);
    await expect(
      service.getCompanyPermission(4, 8, 'chatApplicants', allow),
    ).resolves.toBe(true);
    expect(allow).toHaveBeenCalledTimes(1);

    await expect(
      service.getCompanyPermission(4, 9, 'chatApplicants', deny),
    ).resolves.toBe(false);
    await expect(
      service.getCompanyPermission(4, 9, 'chatApplicants', deny),
    ).resolves.toBe(false);
    expect(deny).toHaveBeenCalledTimes(2);
  });

  it('invalidates cached permission decisions after membership changes', async () => {
    const service = new ChatAuthorizationCacheService();
    const loader = jest.fn(async () => true);

    await service.getCompanyPermission(4, 8, 'chatApplicants', loader);
    await service.invalidateCompanyUser(4, 8);
    await service.getCompanyPermission(4, 8, 'chatApplicants', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
