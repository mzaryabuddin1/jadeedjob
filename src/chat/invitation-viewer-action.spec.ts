import { ChatService } from './chat.service';

describe('Chat invitation viewer actions', () => {
  const service = new ChatService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { enabled: false } as any,
    {
      getCompanyPermission: jest.fn(async () => false),
    } as any,
  );

  it('returns respond for the invitee, cancel for the inviter, and null otherwise', () => {
    const invitation = {
      status: 'pending',
      inviterUserId: 7,
      inviteeUserId: 9,
    };
    expect((service as any).invitationViewerAction(invitation, 9)).toBe(
      'respond',
    );
    expect((service as any).invitationViewerAction(invitation, 7)).toBe(
      'cancel',
    );
    expect((service as any).invitationViewerAction(invitation, 11)).toBeNull();
    expect(
      (service as any).invitationViewerAction(
        { ...invitation, status: 'accepted' },
        9,
      ),
    ).toBeNull();
  });

  it('lets the external invitee access a company invitation without company permissions', async () => {
    await expect(
      (service as any).canAccess(
        {
          type: 'invitation',
          companyId: 4,
          createdByUserId: 7,
          participants: [
            { userId: 7, active: true },
            { userId: 9, active: true },
          ],
        },
        9,
      ),
    ).resolves.toBe(true);
  });
});
