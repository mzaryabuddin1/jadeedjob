import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Env
import { ConfigModule } from '@nestjs/config';

// App Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
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
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from './firebase/firebase.module';
import { ChatModule } from './chat/chat.module';
import { RatingModule } from './rating/rating.module';
import { AuthSessionModule } from './auth/auth-session.module';
import { ReelsModule } from './reels/reels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PostsModule } from './posts/posts.module';
import { ScheduleModule } from '@nestjs/schedule';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { StorageModule } from './storage/storage.module';
import { PushModule } from './push/push.module';
import { ModerationModule } from './moderation/moderation.module';
import { AccountDeletionModule } from './users/account-deletion.module';
import { RealtimeModule } from './realtime/realtime.module';
import { LegalModule } from './legal/legal.module';
import { ChatMongoModule } from './chat/storage/chat-mongo.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ChatMongoModule.register(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      legacySpatialSupport: false,
    }),
    ScheduleModule.forRoot(),
    AuthSessionModule,
    IdempotencyModule,
    StorageModule,
    RealtimeModule,
    PushModule,
    ModerationModule,
    LegalModule,
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
          ttl: 60000,
          limit: 120,
        },
      ],
    }),
    FilterModule,
    JobModule,
    JobApplicationModule,
    OrganizationModule,
    FilesModule,
    PagesModule,
    FirebaseModule,
    ChatModule,
    RatingModule,
    ReelsModule,
    NotificationsModule,
    SupportModule,
    ProfilesModule,
    PostsModule,
    AccountDeletionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // ⬅️ Apply Throttler globally
    },
  ],
})
export class AppModule {}
