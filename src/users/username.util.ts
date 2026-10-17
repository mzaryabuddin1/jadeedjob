import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/** Days a user must wait between username changes (the first change is free) */
export const USERNAME_COOLDOWN_DAYS = 7;
export const USERNAME_COOLDOWN_MS =
  USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * 3-30 chars: lowercase letters, digits, `.` and `_`;
 * starts and ends with a letter/digit, no two `.`/`_` in a row.
 */
export const USERNAME_PATTERN =
  /^(?!.*[._]{2})[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;

export const USERNAME_RULES_TEXT =
  'Username must be 3-30 characters: lowercase letters, numbers, "." and "_" (must start and end with a letter or number, no repeated "." or "_")';

/** lowercase, trim, drop a leading @ */
export function normalizeUsername(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomString(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** "Ali Khan" -> "alikhan" (latin letters/digits only, max 20 chars) */
function nameBase(firstName?: string, lastName?: string): string {
  const base = `${firstName ?? ''}${lastName ?? ''}`
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return base || 'user';
}

/**
 * Unique username from first + last name + random suffix, e.g. `alikhan_k3f9a`.
 * Checks the DB; the unique index is the final guard.
 */
export async function generateUniqueUsername(
  userRepo: Repository<User>,
  firstName?: string,
  lastName?: string,
): Promise<string> {
  const base = nameBase(firstName, lastName);

  for (let attempt = 0; attempt < 10; attempt++) {
    // grow the suffix if we keep colliding
    const candidate = `${base}_${randomString(attempt < 5 ? 5 : 8)}`;
    const taken = await userRepo.exist({ where: { username: candidate } });
    if (!taken) return candidate;
  }

  return `${base}_${randomString(12)}`;
}
