import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = String(request.headers.authorization || '').trim();
    if (!authHeader) {
      request.user = null;
      return true;
    }

    request.user =
      await this.authSessionService.validateAuthorizationHeader(authHeader);
    return true;
  }
}
