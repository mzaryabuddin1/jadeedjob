import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SystemAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
