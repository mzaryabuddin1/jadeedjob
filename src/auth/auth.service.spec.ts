import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, PendingSocialSignup } from './auth.service';
import { User } from 'src/users/entities/user.entity';
import { UserAuthIdentity } from 'src/users/entities/user-auth-identity.entity';

describe('AuthService account linking', () => {
  let service: AuthService;

  const users: User[] = [];
  const identities: UserAuthIdentity[] = [];
  let userSeq = 1;
  let identitySeq = 1;

  const makeEmailQb = (source: 'users' | 'identities') => {
    const state: { email?: string; excludeUserId?: number } = {};
    const qb: any = {
      where(_sql: string, params: any) {
        state.email = params?.email;
        return qb;
      },
      andWhere(sql: string, params?: any) {
        if (params?.excludeUserId != null) state.excludeUserId = params.excludeUserId;
        if (sql.includes('userId') && params?.excludeUserId != null) {
          state.excludeUserId = params.excludeUserId;
        }
        return qb;
      },
      async getOne() {
        if (source === 'users') {
          return (
            users.find(
              (u) =>
                u.email &&
                u.email.toLowerCase() === state.email &&
                u.id !== state.excludeUserId,
            ) || null
          );
        }
        return (
          identities.find(
            (i) =>
              i.providerEmail &&
              i.providerEmail.toLowerCase() === state.email &&
              i.userId !== state.excludeUserId,
          ) || null
        );
      },
    };
    return qb;
  };

  const userRepo = {
    find: jest.fn(async () => users.map((u) => ({ ...u }))),
    findOne: jest.fn(async ({ where }: any) => {
      if (where?.id != null) {
        return users.find((u) => u.id === where.id) || null;
      }
      if (where?.phone) {
        return users.find((u) => u.phone === where.phone) || null;
      }
      if (where?.email && where?.id?.['_type'] === 'not') {
        // TypeORM Not() is an object — simplified for tests using plain shape
        return null;
      }
      if (where?.email) {
        const excludeId = where.id?._value ?? where.id;
        if (excludeId && typeof excludeId === 'number') {
          return (
            users.find((u) => u.email === where.email && u.id !== excludeId) ||
            null
          );
        }
        // handle Not() from typeorm - check if id has _type
        if (where.id && typeof where.id === 'object') {
          return (
            users.find((u) => u.email === where.email) || null
          );
        }
        return users.find((u) => u.email === where.email) || null;
      }
      if (where?.googleId) {
        return users.find((u) => u.googleId === where.googleId) || null;
      }
      if (where?.facebookId) {
        return users.find((u) => u.facebookId === where.facebookId) || null;
      }
      return null;
    }),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (data: any) => {
      if (data.id) {
        const idx = users.findIndex((u) => u.id === data.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...data };
          return users[idx];
        }
      }
      const created = {
        ...data,
        id: userSeq++,
        isBanned: false,
        kyc_status: data.kyc_status || 'pending',
      } as User;
      users.push(created);
      return created;
    }),
    update: jest.fn(async (id: number, patch: any) => {
      const idx = users.findIndex((u) => u.id === id);
      if (idx >= 0) users[idx] = { ...users[idx], ...patch };
    }),
    createQueryBuilder: jest.fn(() => makeEmailQb('users')),
  };

  const identityRepo = {
    find: jest.fn(async ({ where }: any) => {
      if (where?.userId != null) {
        return identities.filter((i) => i.userId === where.userId);
      }
      return identities;
    }),
    findOne: jest.fn(async ({ where }: any) => {
      return (
        identities.find(
          (i) =>
            i.provider === where.provider && i.providerId === where.providerId,
        ) || null
      );
    }),
    findOneOrFail: jest.fn(async ({ where }: any) => {
      const row = identities.find(
        (i) =>
          i.provider === where.provider && i.providerId === where.providerId,
      );
      if (!row) throw new Error('Identity not found');
      return row;
    }),
    count: jest.fn(async ({ where }: any) => {
      return identities.filter(
        (i) => i.userId === where.userId && i.provider === where.provider,
      ).length;
    }),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (data: any) => {
      const row = { ...data, id: identitySeq++, linkedAt: new Date() };
      identities.push(row);
      return row;
    }),
    insert: jest.fn(async (data: any) => {
      identities.push({ ...data, id: identitySeq++, linkedAt: new Date() } as any);
      return { identifiers: [{ id: identitySeq - 1 }] };
    }),
    createQueryBuilder: jest.fn(() => makeEmailQb('identities')),
  };

  const jwtService = {
    sign: jest.fn((payload: any) => Buffer.from(JSON.stringify(payload)).toString('base64')),
    verify: jest.fn((token: string) =>
      JSON.parse(Buffer.from(token, 'base64').toString('utf8')),
    ),
  };

  const filterService = {
    getTopFiltersByJobs: jest.fn(async () => [1, 2, 3]),
  };

  const firebaseService = {
    subscribeTokenToFilters: jest.fn(),
  };

  const countryRepo = {
    findOne: jest.fn(async () => ({ id: 41, name: 'Pakistan' })),
  };
  const languageRepo = {
    findOne: jest.fn(async () => ({ id: 2, name: 'Urdu' })),
  };
  const cityRepo = {
    findOne: jest.fn(async ({ where }: any) =>
      where?.id ? { id: where.id, name: 'Karachi' } : null,
    ),
  };

  beforeEach(() => {
    users.length = 0;
    identities.length = 0;
    userSeq = 1;
    identitySeq = 1;
    jest.clearAllMocks();

    // Re-bind findOne for Not() email checks used in linkIdentityToUser
    userRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.id != null && typeof where.id === 'number') {
        return users.find((u) => u.id === where.id) || null;
      }
      if (where?.phone) {
        return users.find((u) => u.phone === where.phone) || null;
      }
      if (where?.email) {
        // TypeORM Not(userId) — treat as "any other user with this email"
        const matches = users.filter((u) => u.email === where.email);
        if (where.id && typeof where.id === 'object') {
          // approximate: return first match that isn't "self" if we can; for conflict tests return any
          return matches[0] || null;
        }
        return matches[0] || null;
      }
      if (where?.googleId) {
        return users.find((u) => u.googleId === where.googleId) || null;
      }
      if (where?.facebookId) {
        return users.find((u) => u.facebookId === where.facebookId) || null;
      }
      return null;
    });

    service = new AuthService(
      jwtService as unknown as JwtService,
      userRepo as any,
      identityRepo as any,
      countryRepo as any,
      languageRepo as any,
      cityRepo as any,
      filterService as any,
      firebaseService as any,
      {} as any,
      {} as any,
    );

    // Avoid heavy migrate on construct path — OnModuleInit not auto-called in unit test
  });

  const pendingGoogle = (
    overrides: Partial<PendingSocialSignup> = {},
  ): PendingSocialSignup => ({
    purpose: 'kyc_pending',
    provider: 'google',
    providerId: 'google-sub-1',
    email: 'guser@gmail.com',
    firstName: 'G',
    lastName: 'User',
    picture: null,
    ...overrides,
  });

  it('creates a new user when phone does not exist', async () => {
    const result = await service.resolveSocialKyc(pendingGoogle(), {
      phone: '+923001111111',
      country: 41,
      language: 2,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.isNewUser).toBe(true);
      expect(result.user.phone).toBe('+923001111111');
      expect(result.user.email).toBe('guser@gmail.com');
      expect(result.user.googleId).toBe('google-sub-1');
      expect(service.isKycComplete(result.user)).toBe(true);
    }
    expect(identities).toHaveLength(1);
  });

  it('links Google to existing phone account without email (first social)', async () => {
    users.push({
      id: 10,
      phone: '+923002222222',
      email: null as any,
      firstName: 'Phone',
      lastName: 'User',
      googleId: null as any,
      facebookId: null as any,
      authProvider: 'phone',
      passwordHash: 'x',
      passwordSalt: 'y',
      isBanned: false,
      kyc_status: 'phone_verified',
      profile_photo: null as any,
    } as User);
    userSeq = 11;

    const result = await service.resolveSocialKyc(pendingGoogle(), {
      phone: '+923002222222',
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe(10);
      expect(result.user.googleId).toBe('google-sub-1');
      expect(result.user.email).toBe('guser@gmail.com'); // filled because empty
      expect(service.isKycComplete(result.user)).toBe(true);
    }
  });

  it('does not overwrite existing email when linking social', async () => {
    users.push({
      id: 11,
      phone: '+923003333333',
      email: 'keep@example.com',
      firstName: 'Phone',
      lastName: 'User',
      googleId: null as any,
      facebookId: null as any,
      authProvider: 'phone',
      isBanned: false,
      kyc_status: 'phone_verified',
      profile_photo: null as any,
    } as User);

    const result = await service.resolveSocialKyc(pendingGoogle(), {
      phone: '+923003333333',
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.user.email).toBe('keep@example.com');
      expect(result.user.googleId).toBe('google-sub-1');
    }
  });

  it('requires confirmation when linking a second Google account', async () => {
    users.push({
      id: 12,
      phone: '+923004444444',
      email: 'first@gmail.com',
      firstName: 'A',
      lastName: 'B',
      googleId: 'google-sub-old',
      facebookId: null as any,
      authProvider: 'google',
      isBanned: false,
      kyc_status: 'phone_verified',
      profile_photo: null as any,
    } as User);
    identities.push({
      id: 1,
      userId: 12,
      provider: 'google',
      providerId: 'google-sub-old',
      providerEmail: 'first@gmail.com',
      linkedAt: new Date(),
    } as UserAuthIdentity);

    const result = await service.resolveSocialKyc(
      pendingGoogle({ providerId: 'google-sub-new', email: 'second@gmail.com' }),
      { phone: '+923004444444' },
    );

    expect(result.status).toBe('needs_confirmation');
    if (result.status === 'needs_confirmation') {
      expect(result.link_token).toBeTruthy();
      expect(result.user.googleId).toBe('google-sub-old'); // not replaced
      expect(result.user.email).toBe('first@gmail.com');
    }
  });

  it('blocks if social identity already linked to another user', async () => {
    users.push({
      id: 20,
      phone: '+923005555555',
      email: 'other@gmail.com',
      firstName: 'Other',
      lastName: 'User',
      googleId: 'google-sub-1',
      facebookId: null as any,
      authProvider: 'google',
      isBanned: false,
      kyc_status: 'phone_verified',
    } as User);
    users.push({
      id: 21,
      phone: '+923006666666',
      email: null as any,
      firstName: 'Phone',
      lastName: 'Only',
      googleId: null as any,
      facebookId: null as any,
      authProvider: 'phone',
      isBanned: false,
      kyc_status: 'phone_verified',
    } as User);
    identities.push({
      id: 2,
      userId: 20,
      provider: 'google',
      providerId: 'google-sub-1',
      providerEmail: 'other@gmail.com',
      linkedAt: new Date(),
    } as UserAuthIdentity);

    await expect(
      service.resolveSocialKyc(pendingGoogle(), {
        phone: '+923006666666',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('loginWithGoogle does not match by email alone', async () => {
    users.push({
      id: 30,
      phone: '+923007777777',
      email: 'guser@gmail.com',
      firstName: 'Phone',
      lastName: 'User',
      googleId: null as any,
      facebookId: null as any,
      authProvider: 'phone',
      isBanned: false,
      kyc_status: 'phone_verified',
    } as User);

    const googleAuth = {
      getProfileFromToken: jest.fn(async () => ({
        providerId: 'brand-new-google',
        email: 'guser@gmail.com',
        firstName: 'G',
        lastName: 'User',
        picture: null,
      })),
    };

    (service as any).googleAuthService = googleAuth;

    const res = await service.loginWithGoogle('fake-id-token');
    expect(res).toHaveProperty('kyc_token');
    expect((res as any).kyc_complete).toBe(false);
    expect((res as any).access_token).toBeUndefined();
  });

  it('confirmLinkIdentity adds additional google without replacing primary', async () => {
    users.push({
      id: 40,
      phone: '+923008888888',
      email: 'primary@gmail.com',
      firstName: 'P',
      lastName: 'U',
      googleId: 'google-primary',
      facebookId: null as any,
      authProvider: 'google',
      isBanned: false,
      kyc_status: 'phone_verified',
      profile_photo: null as any,
    } as User);
    identities.push({
      id: 5,
      userId: 40,
      provider: 'google',
      providerId: 'google-primary',
      providerEmail: 'primary@gmail.com',
      linkedAt: new Date(),
    } as UserAuthIdentity);

    const linkToken = service.generateLinkToken({
      purpose: 'link_confirm',
      userId: 40,
      provider: 'google',
      providerId: 'google-secondary',
      providerEmail: 'second@gmail.com',
      firstName: 'S',
      lastName: 'U',
      picture: null,
    });

    const res = await service.confirmLinkIdentity(linkToken);
    expect(res.kyc_complete).toBe(true);
    expect(res.user.googleId).toBe('google-primary');
    expect(res.user.email).toBe('primary@gmail.com');
    expect(
      identities.filter((i) => i.userId === 40 && i.provider === 'google'),
    ).toHaveLength(2);
  });
});
