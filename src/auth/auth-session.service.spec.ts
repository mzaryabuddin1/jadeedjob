import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService refresh rotation', () => {
  const previousSecret = process.env.JWT_SECRET;

  afterAll(() => {
    process.env.JWT_SECRET = previousSecret;
  });

  it('rotates refresh tokens and persistently revokes the session on reuse', async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';
    const user = {
      id: 7,
      tokenVersion: 3,
      systemRole: 'user',
      isBanned: false,
      deletionScheduledAt: null,
      deletedAt: null,
    };
    const sessions = new Map<string, any>();
    const sessionRepo: any = {
      update: jest.fn(async () => undefined),
      create: jest.fn((value) => value),
      save: jest.fn(async (session) => {
        sessions.set(session.id, session);
        return session;
      }),
      findOne: jest.fn(async ({ where }) => sessions.get(where.id) || null),
    };
    const transactionalSessionRepo = {
      findOne: jest.fn(async ({ where }) => {
        const session = sessions.get(where.id);
        return session ? { ...session, user } : null;
      }),
    };
    sessionRepo.manager = {
      transaction: jest.fn(async (work) =>
        work({
          getRepository: jest.fn(() => transactionalSessionRepo),
          save: jest.fn(async (session) => {
            sessions.set(session.id, session);
            return session;
          }),
        }),
      ),
    };
    const userRepo: any = {
      findOne: jest.fn(async () => user),
    };
    const service = new AuthSessionService(userRepo, sessionRepo);

    const initial = await service.createSession(user as any, {
      installationId: 'ios-simulator',
      platform: 'ios',
    });
    const rotated = await service.refresh(initial.refreshToken);

    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(rotated.accessTokenExpiresIn).toBe(900);
    expect(rotated.accessToken).toBe(rotated.access_token);

    let reuseError: any;
    try {
      await service.refresh(initial.refreshToken);
    } catch (error) {
      reuseError = error;
    }
    expect(reuseError?.getResponse()).toMatchObject({
      code: 'AUTH_REFRESH_REUSE_DETECTED',
    });
    expect(sessions.get(initial.sessionId)).toMatchObject({
      revokedReason: 'refresh_reuse_detected',
    });

    await expect(service.refresh(rotated.refreshToken)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'AUTH_SESSION_REVOKED' }),
    });
  });
});
