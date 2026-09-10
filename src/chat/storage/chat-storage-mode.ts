export type ChatStorageMode = 'sql' | 'dual' | 'mongo';

export function getChatStorageMode(): ChatStorageMode {
  const value = String(process.env.CHAT_STORAGE_MODE || 'sql')
    .trim()
    .toLowerCase();
  if (value !== 'sql' && value !== 'dual' && value !== 'mongo') {
    throw new Error('CHAT_STORAGE_MODE must be sql, dual, or mongo');
  }
  return value;
}

export function mongoChatEnabled() {
  return getChatStorageMode() !== 'sql';
}
