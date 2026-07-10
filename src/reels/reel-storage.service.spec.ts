import {
  isAllowedReelFileName,
  isAllowedReelMimeType,
  normalizeReelExtension,
} from './reel-storage.service';

describe('reel storage validation helpers', () => {
  it('allows expected short-form video types and extensions', () => {
    expect(isAllowedReelMimeType('video/mp4')).toBe(true);
    expect(isAllowedReelMimeType('video/quicktime')).toBe(true);
    expect(isAllowedReelFileName('shift-demo.mp4')).toBe(true);
    expect(isAllowedReelFileName('site-tour.mov')).toBe(true);
  });

  it('rejects non-video files', () => {
    expect(isAllowedReelMimeType('image/png')).toBe(false);
    expect(isAllowedReelFileName('profile.png')).toBe(false);
  });

  it('normalizes missing or unknown extensions from the content type', () => {
    expect(normalizeReelExtension('clip', 'video/quicktime')).toBe('.mov');
    expect(normalizeReelExtension('clip', 'video/webm')).toBe('.webm');
    expect(normalizeReelExtension('clip', 'video/mp4')).toBe('.mp4');
  });
});
