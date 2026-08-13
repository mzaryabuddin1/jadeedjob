import { CanActivate, ExecutionContext } from '@nestjs/common';
import { LegalService } from './legal.service';
export declare class CommunityGuidelinesGuard implements CanActivate {
    private readonly legalService;
    constructor(legalService: LegalService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
