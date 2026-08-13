import { AccountDeletionService } from './account-deletion.service';

const setup = (user: any = null, companies: any[] = []) => {
  const userRepo = { findOne: jest.fn(async () => user) };
  const deletionRepo = { findOne: jest.fn(async () => null) };
  const companyRepo = {
    find: jest.fn(async () => companies),
    count: jest.fn(async () => companies.length),
  };
  const otpService = {
    createOtp: jest.fn(async () => ({ otp: '123456' })),
    verifyOtp: jest.fn(async () => {
      throw new Error('invalid');
    }),
    wasRecentlyUsed: jest.fn(async () => false),
  };
  const twilioService = { sendSms: jest.fn(async () => ({})) };
  const service = new AccountDeletionService(
    userRepo as any,
    deletionRepo as any,
    companyRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    otpService as any,
    twilioService as any,
    {} as any,
    { removeAllForUser: jest.fn() } as any,
    {} as any,
    {} as any,
  );
  return {
    service,
    userRepo,
    deletionRepo,
    companyRepo,
    otpService,
    twilioService,
  };
};

describe('AccountDeletionService public flow', () => {
  it('returns the same generic send response for missing and existing accounts', async () => {
    const missing = setup(null);
    await expect(missing.service.sendPublicDeletionOtp('03000000000')).resolves.toEqual({
      message: 'If the account is eligible, an OTP has been sent.',
    });
    expect(missing.otpService.createOtp).not.toHaveBeenCalled();

    const existing = setup({ id: 7, phone: '03000000000' });
    await expect(existing.service.sendPublicDeletionOtp('03000000000')).resolves.toEqual({
      message: 'If the account is eligible, an OTP has been sent.',
    });
    expect(existing.otpService.createOtp).toHaveBeenCalled();
  });

  it('uses one enumeration-safe error for unknown and invalid confirmations', async () => {
    await expect(
      setup(null).service.confirmPublicDeletion('03000000000', '000000'),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      setup({ id: 7, phone: '03000000000' }).service.confirmPublicDeletion(
        '03000000000',
        '000000',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('returns ownership blockers as a successful public confirmation result', async () => {
    const fixture = setup(
      { id: 7, phone: '03000000000' },
      [{ id: 12, company_name: 'JobsLoot Demo' }],
    );
    fixture.otpService.verifyOtp.mockResolvedValue({} as any);

    await expect(
      fixture.service.confirmPublicDeletion('03000000000', '123456'),
    ).resolves.toEqual({
      status: 'blocked',
      code: 'ACCOUNT_DELETION_BLOCKED',
      message: 'Transfer ownership of these companies before deleting the account',
      details: {
        companies: [
          { companyId: 12, name: 'JobsLoot Demo', reason: 'sole_owner' },
        ],
      },
    });
  });
});
