import { randomBytes } from 'crypto';

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode() {
  const bytes = randomBytes(8);
  let code = 'JJ';

  for (let i = 0; i < 8; i += 1) {
    code += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
  }

  return code;
}
