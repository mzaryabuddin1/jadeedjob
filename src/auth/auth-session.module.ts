import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthSessionService } from './auth-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthSessionService, JwtAuthGuard],
  exports: [AuthSessionService, JwtAuthGuard],
})
export class AuthSessionModule {}
