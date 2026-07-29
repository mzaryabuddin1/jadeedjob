import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AuthSessionService } from './auth-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemAdminGuard } from './system-admin.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, AuthSession])],
  providers: [
    AuthSessionService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    SystemAdminGuard,
  ],
  exports: [
    AuthSessionService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    SystemAdminGuard,
  ],
})
export class AuthSessionModule {}
