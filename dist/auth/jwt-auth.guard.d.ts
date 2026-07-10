import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthSessionService } from './auth-session.service';
export declare class JwtAuthGuard implements CanActivate {
    private readonly authSessionService;
    constructor(authSessionService: AuthSessionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
