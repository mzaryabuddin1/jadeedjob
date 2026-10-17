import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare const USERNAME_COOLDOWN_DAYS = 7;
export declare const USERNAME_COOLDOWN_MS: number;
export declare const USERNAME_PATTERN: RegExp;
export declare const USERNAME_RULES_TEXT = "Username must be 3-30 characters: lowercase letters, numbers, \".\" and \"_\" (must start and end with a letter or number, no repeated \".\" or \"_\")";
export declare function normalizeUsername(raw: string): string;
export declare function generateUniqueUsername(userRepo: Repository<User>, firstName?: string, lastName?: string): Promise<string>;
