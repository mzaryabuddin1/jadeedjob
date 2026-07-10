import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    request.user =
      await this.authSessionService.validateAuthorizationHeader(authHeader);

    return true;
  }
}
