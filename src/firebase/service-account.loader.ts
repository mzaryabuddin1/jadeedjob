import { existsSync, readFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

/**
 * Finds the Firebase service account (server-side credentials), first match wins:
 *   1. env FIREBASE_SERVICE_ACCOUNT_JSON  - the JSON itself, raw or base64
 *      (best for production: nothing to upload, nothing in git)
 *   2. env FIREBASE_SERVICE_ACCOUNT_PATH  - path to a JSON file
 *   3. ./service-account.json             - next to this file (git-ignored)
 *   4. ./jobslootstaging-8fa70d6ad08a.json - legacy staging file
 */
export function loadServiceAccount(): Record<string, any> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const text = raw.startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  }

  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const candidates = [
    configured && (isAbsolute(configured) ? configured : resolve(configured)),
    join(__dirname, 'service-account.json'),
    join(__dirname, 'jobslootstaging-8fa70d6ad08a.json'),
  ].filter(Boolean) as string[];

  const file = candidates.find((f) => existsSync(f));
  if (!file) {
    throw new Error(
      'Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON ' +
        '(raw or base64), FIREBASE_SERVICE_ACCOUNT_PATH, or place ' +
        'service-account.json in src/firebase/. Tried: ' +
        candidates.join(', '),
    );
  }

  return JSON.parse(readFileSync(file, 'utf8'));
}
