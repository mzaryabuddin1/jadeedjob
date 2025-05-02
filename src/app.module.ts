import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// MONGO
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OtpService } from './otp/otp.service';
import { OtpModule } from './otp/otp.module';


@Module({
  imports: [
    ConfigModule.forRoot(), // Loads .env variables
    MongooseModule.forRoot(process.env.MONGODB_URI), AuthModule, UsersModule, OtpModule,
  ],
  controllers: [AppController],
  providers: [AppService, OtpService],
})
export class AppModule {}
