import {
  isAllowedPostVideoFileName,
  isAllowedPostVideoMimeType,
  isAllowedPostVideoProbeFormat,
  POST_VIDEO_MAX_BYTES,
} from './post-video-storage.service';

describe('PostVideoStorageService validation', () => {
  it('accepts cross-platform community video formats', () => {
    expect(isAllowedPostVideoMimeType('video/mp4')).toBe(true);
    expect(isAllowedPostVideoMimeType('video/quicktime')).toBe(true);
    expect(isAllowedPostVideoMimeType('video/x-m4v')).toBe(true);
    expect(isAllowedPostVideoFileName('training.mp4')).toBe(true);
    expect(isAllowedPostVideoFileName('training.mov')).toBe(true);
    expect(isAllowedPostVideoFileName('training.m4v')).toBe(true);
  });

  it('rejects unsupported formats and keeps the 100 MB limit explicit', () => {
    expect(isAllowedPostVideoMimeType('video/x-msvideo')).toBe(false);
    expect(isAllowedPostVideoFileName('training.avi')).toBe(false);
    expect(POST_VIDEO_MAX_BYTES).toBe(100 * 1024 * 1024);
  });

  it('accepts only MP4-family containers reported by ffprobe', () => {
    expect(
      isAllowedPostVideoProbeFormat('mov,mp4,m4a,3gp,3g2,mj2'),
    ).toBe(true);
    expect(isAllowedPostVideoProbeFormat('mp4')).toBe(true);
    expect(isAllowedPostVideoProbeFormat('avi')).toBe(false);
    expect(isAllowedPostVideoProbeFormat('matroska,webm')).toBe(false);
  });
});
