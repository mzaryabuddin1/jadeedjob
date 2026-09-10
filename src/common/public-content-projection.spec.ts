import {
  projectPublicPost,
  projectPublicProfile,
  projectPublicReel,
} from './public-content-projection';

describe('public content projections', () => {
  it('keeps public post fields and drops viewer and storage internals', () => {
    const projected = projectPublicPost({
      id: 3,
      body: 'Ready for work',
      publisher: {
        type: 'user',
        id: 9,
        name: 'Worker',
        email: 'private@example.com',
      },
      media: {
        type: 'image',
        assetId: 'asset-1',
        url: 'https://signed.example/image',
        storageKey: 'private/key',
      },
      stats: { likes: 2, comments: 1, saves: 8 },
      viewerState: { canManage: true },
      creator: { phone: '03000000000' },
    });
    expect(projected).toMatchObject({
      id: '3',
      body: 'Ready for work',
      media: { assetId: 'asset-1' },
    });
    expect(projected).not.toHaveProperty('viewerState');
    expect(projected).not.toHaveProperty('creator');
    expect(projected.media).not.toHaveProperty('storageKey');
    expect(projected.publisher).not.toHaveProperty('email');
  });

  it('never exposes reel ownership or upload fields', () => {
    const projected = projectPublicReel({
      id: 5,
      caption: 'Painting',
      media: {
        type: 'video',
        assetId: 'video-1',
        url: 'https://signed.example/video',
      },
      uploadId: 'secret-upload',
      storageKey: 'quarantine/key',
      viewerState: { isOwner: true },
    });
    expect(projected.media.assetId).toBe('video-1');
    expect(projected).not.toHaveProperty('uploadId');
    expect(projected).not.toHaveProperty('storageKey');
    expect(projected).not.toHaveProperty('viewerState');
  });

  it('whitelists profile fields', () => {
    const projected = projectPublicProfile({
      profile: {
        type: 'user',
        id: 2,
        name: 'A',
        email: 'private@example.com',
        phone: '0300',
        skills: ['Painting'],
      },
      sessionId: 'secret',
    });
    expect(projected.profile).toMatchObject({
      id: '2',
      name: 'A',
      skills: ['Painting'],
    });
    expect(projected.profile).not.toHaveProperty('email');
    expect(projected.profile).not.toHaveProperty('phone');
    expect(projected).not.toHaveProperty('sessionId');
  });
});
