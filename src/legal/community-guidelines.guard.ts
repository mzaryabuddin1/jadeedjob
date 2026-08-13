import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { LegalService } from './legal.service';

@Injectable()
export class CommunityGuidelinesGuard implements CanActivate {
  constructor(private readonly legalService: LegalService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    await this.legalService.assertCommunityAccepted(Number(request.user?.id));
    return true;
  }
}
