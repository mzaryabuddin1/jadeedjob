const {
  DEMO_REEL_CREATOR_PHONES,
  buildDemoReelPlan,
} = require('../../scripts/seed-demo-reels');

describe('demo reel seed plan', () => {
  it('maps exactly four bundled app videos to stable backend reel files', () => {
    const plan = buildDemoReelPlan({
      mobileAppDir: '/tmp/mobile-app-jadeedjob',
      uploadRoot: '/tmp/backend/uploads/reels',
      appUrl: 'http://api.example.test/',
    });

    expect(plan.reels.map((reel) => reel.sourceFileName)).toEqual([
      'video-1.mp4',
      'video-2.mp4',
      'video-3.mp4',
      'video-4.mp4',
    ]);
    expect(plan.reels.map((reel) => reel.targetFileName)).toEqual([
      'community-kitchen-shift.mp4',
      'nearby-electrician.mp4',
      'market-morning.mp4',
      'social-city-loop.mp4',
    ]);
    expect(plan.reels).toHaveLength(4);
    expect(plan.reels.find((reel) => reel.key === 'employer-story')).toBeUndefined();
  });

  it('builds playable static URLs and reel storage keys under the demo namespace', () => {
    const plan = buildDemoReelPlan({
      mobileAppDir: '/tmp/mobile-app-jadeedjob',
      uploadRoot: '/tmp/backend/uploads/reels',
      appUrl: 'http://localhost:3000/',
    });

    expect(plan.reels[0].sourcePath).toBe(
      '/tmp/mobile-app-jadeedjob/src/assets/demoVideos/video-1.mp4',
    );
    expect(plan.reels[0].targetPath).toBe(
      '/tmp/backend/uploads/reels/demo/community-kitchen-shift.mp4',
    );
    expect(plan.reels[0].storageKey).toBe(
      'reels/demo/community-kitchen-shift.mp4',
    );
    expect(plan.reels[0].videoUrl).toBe(
      'http://localhost:3000/uploads/reels/demo/community-kitchen-shift.mp4',
    );
  });

  it('uses deterministic demo creator accounts outside the main demo user phone range', () => {
    expect(DEMO_REEL_CREATOR_PHONES).toEqual([
      '0300001901',
      '0300001902',
      '0300001903',
      '0300001904',
    ]);
  });
});
