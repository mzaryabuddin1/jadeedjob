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
  );

  it('returns respond for the invitee, cancel for the inviter, and null otherwise', () => {
    const invitation = {
      status: 'pending',
      inviterUserId: 7,
      inviteeUserId: 9,
    };
    expect((service as any).invitationViewerAction(invitation, 9)).toBe('respond');
    expect((service as any).invitationViewerAction(invitation, 7)).toBe('cancel');
    expect((service as any).invitationViewerAction(invitation, 11)).toBeNull();
    expect(
      (service as any).invitationViewerAction(
        { ...invitation, status: 'accepted' },
        9,
      ),
    ).toBeNull();
  });
});
