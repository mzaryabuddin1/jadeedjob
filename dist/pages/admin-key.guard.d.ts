import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AdminKeyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
