import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Env
import { ConfigModule } from '@nestjs/config';

// App Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OtpService } from './otp/otp.service';
import { OtpModule } from './otp/otp.module';
import { TwilioModule } from './twilio/twilio.module';
import { CountryModule } from './country/country.module';
import { LanguageModule } from './language/language.module';

// Throttling
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FilterModule } from './filter/filter.module';
import { JobModule } from './job/job.module';
import { JobApplicationModule } from './job-application/job-application.module';
import { OrganizationModule } from './organization/organization.module';
import { FilesModule } from './files/files.module';
import { PagesModule } from './pages/pages.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}), // Load .env
    // MongooseModule.forRoot(process.env.MONGODB_URI),

    // Application Modules
    AuthModule,
    UsersModule,
    OtpModule,
    TwilioModule,
    CountryModule,
    LanguageModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 30000, // 30 seconds window
          limit: 10,   // 1 request per IP per window
        },
      ],
    }),
    FilterModule,
    JobModule,
    JobApplicationModule,
    OrganizationModule,
    FilesModule,
    PagesModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OtpService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // ⬅️ Apply Throttler globally
    },
  ],
})
export class AppModule {}
