import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/user.schema';
import { UsersModule } from 'src/users/users.module';
import { OtpModule } from 'src/otp/otp.module';
import { TwilioModule } from 'src/twilio/twilio.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret', // Replace with env var in production
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    OtpModule,
    TwilioModule
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
