import { getChatStorageMode, mongoChatEnabled } from './chat-storage-mode';

describe('chat storage mode', () => {
  const original = process.env.CHAT_STORAGE_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.CHAT_STORAGE_MODE;
    else process.env.CHAT_STORAGE_MODE = original;
  });

  it('defaults to SQL and accepts the staged modes', () => {
    delete process.env.CHAT_STORAGE_MODE;
    expect(getChatStorageMode()).toBe('sql');
    expect(mongoChatEnabled()).toBe(false);
    process.env.CHAT_STORAGE_MODE = 'dual';
    expect(getChatStorageMode()).toBe('dual');
    expect(mongoChatEnabled()).toBe(true);
    process.env.CHAT_STORAGE_MODE = 'mongo';
    expect(getChatStorageMode()).toBe('mongo');
  });

  it('rejects unknown modes', () => {
    process.env.CHAT_STORAGE_MODE = 'automatic';
    expect(() => getChatStorageMode()).toThrow(
      'CHAT_STORAGE_MODE must be sql, dual, or mongo',
    );
  });
});
