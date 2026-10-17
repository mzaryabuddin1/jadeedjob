import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Protects the staff-only endpoints (page verification review).
 * Works only when env ADMIN_API_KEY is set and the request sends the same
 * value in the `x-admin-key` header. Unset = the endpoints do not exist (404).
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) throw new NotFoundException();

    const given = String(
      context.switchToHttp().getRequest().headers['x-admin-key'] ?? '',
    );
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
