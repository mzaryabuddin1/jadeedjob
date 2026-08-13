import { NotificationsService } from './notifications.service';

describe('NotificationsService deduplication', () => {
  it('stores canonical string navigation IDs and does not push a replay', async () => {
    const stored = {
      id: 1,
      userId: 7,
      type: 'post_comment',
      title: 'New comment',
      message: 'Commented',
      data: { schemaVersion: '1', type: 'post_comment', postId: '12' },
      dedupeKey: 'post:12:comment:3:user:7',
      readAt: null,
      createdAt: new Date(),
    };
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ raw: { affectedRows: 1 }, identifiers: [{ id: 1 }] })
      .mockResolvedValueOnce({ raw: { affectedRows: 0 }, identifiers: [] });
    const notificationRepo = {
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute,
      })),
      findOne: jest.fn(async () => stored),
    };
    const pushService = { sendToUser: jest.fn(async () => ({})) };
    const service = new NotificationsService(
      notificationRepo as any,
      {} as any,
      pushService as any,
    );

    await service.create({
      userId: 7,
      type: 'post_comment',
      title: 'New comment',
      message: 'Commented',
      data: { postId: 12 },
      dedupeKey: stored.dedupeKey,
    });
    await service.create({
      userId: 7,
      type: 'post_comment',
      title: 'New comment',
      message: 'Commented',
      data: { postId: 12 },
      dedupeKey: stored.dedupeKey,
    });

    expect(pushService.sendToUser).toHaveBeenCalledTimes(1);
    expect(pushService.sendToUser).toHaveBeenCalledWith(
      7,
      'community',
      'New comment',
      'Commented',
      { schemaVersion: '1', type: 'post_comment', postId: '12' },
    );
  });
});
