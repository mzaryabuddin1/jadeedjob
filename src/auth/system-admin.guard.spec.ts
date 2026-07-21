import { ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from './system-admin.guard';

const contextFor = (user: any) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as any;

describe('SystemAdminGuard', () => {
  const guard = new SystemAdminGuard();

  it('allows database-authenticated system admins', () => {
    expect(guard.canActivate(contextFor({ systemRole: 'admin' }))).toBe(true);
  });

  it('rejects ordinary users', () => {
    expect(() => guard.canActivate(contextFor({ systemRole: 'user' }))).toThrow(
      ForbiddenException,
    );
  });
});
