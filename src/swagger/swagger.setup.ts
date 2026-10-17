import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  buildFcmButtonScript,
  buildServiceWorker,
  readFcmWebConfig,
} from './fcm-token-button';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('JobsLoot API')
    .setDescription(
      [
        'JobsLoot / JadeedJob backend API docs.',
        '',
        '### Auth',
        '1. Register or Login to get `access_token`',
        '2. Click **Authorize** and paste: `Bearer <token>` or just the token',
        '3. Call protected endpoints',
        '',
        '### Dev OTP',
        'Phone & email OTP is always **`123456`** until production SMS/email is enabled.',
        '',
        '### KYC (Google / Facebook)',
        '**New / unlinked** social → `kyc_complete: false` + `kyc_token` (30 min). No DB user yet.',
        'Then `POST /auth/kyc/send-otp` + `verify-otp` with `kycToken`.',
        'If phone already exists → links to that account (OTP = ownership).',
        'If that account already has another Google/Facebook → `requires_link_confirmation` + `link_token`.',
        'Confirm with `POST /auth/link-identity/confirm` (never overwrites primary email / googleId).',
        'Never auto-links by email match alone.',
        '',
        '### Email update',
        'Use `/auth/update-email/*` (JWT required). Email must be unique.',
        '',
        '### Filters',
        '`GET /filters` — approved categories. Icons: `{ type: "tabler", name }` or `{ type: "custom", svg }`.',
        '`last_update_time` for RN cache. Optional Bearer → preferred filters first.',
        'Update prefs: `PATCH /users/me` with `filter_preferences` (min **4**, max **30**).',
        'Seed: `npm run seed:filters`',
        '',
        '### Jobs',
        'Create/update: `filterIds` (1–10), optional `pictures` (max 4 images),',
        '`isRemote: true` → location optional; otherwise location required.',
        'Description optional. Multipart or JSON supported.',
        'Categories are stored only in the `job_filters` join table (the `jobs` table has no category column).',
        'All job responses return `filterIds` and `filters` — each category is `{ id, name, icon }`. My jobs: `GET /job?myjobs=true`.',
        '',
        '### Job applications',
        '`POST /job-application` - once per job per user (not your own job). The job owner is notified **in a batch, not instantly**:',
        'applications are queued, ~30s later ONE push/email is sent (`3 people applied to your job "X" (12 total)`), busy jobs get at most one every ~2 min.',
        '',
        '### Pages (company profiles)',
        'A **page** is the company profile on JobsLoot. Anyone can create one (`POST /pages`) and becomes its **owner**; jobs can be posted under the page (`pageId`) or individually.',
        '**Roles** (`GET /pages/roles`): `owner` (everything), `admin` (edit page, invite/remove editors, jobs, applications, verification), `editor` (jobs + applications). Only the owner invites admins or changes roles.',
        '**Giving access = invitation**: `POST /pages/:pageId/invitations` (userId or username + role). The invited user gets a notification and must **accept** (`POST /pages/invitations/:id/accept`) - nobody is added without consent. `GET /pages/invitations/me` lists mine.',
        '**Verified tick**: owner/admin uploads company documents (`POST /pages/:pageId/verification`, multipart). Documents are stored privately; staff review them at `/page-verification-admin.html` (needs `ADMIN_API_KEY`) and approved pages get `is_verified: true` (also shown in job responses).',
        'Public page view hides private business details (registration/tax numbers, representative, documents); owner/admin see them.',
        '',
        '### Accept / reject & ratings',
        '`PATCH /job-application/:id/status` - the employer side (job poster, or page owner/admin/editor) accepts or rejects a **pending** application (final). **Accepted -> the applicant gets a push/email.**',
        'After acceptance both sides rate each other once: `POST /ratings` (`GET /ratings/application/:id` tells the app who can rate).',
        'Two scores: **user profile** = average of all ratings received as employee + employer (`GET /ratings/user/:id`); **page** = average of what employees gave jobs posted under that page (`GET /ratings/page/:pageId`).',
        '',
        '### Username',
        'Auto-generated at registration (first + last name + random string, e.g. `alikhan_k3f9a`), unique per user (also for Google/Facebook signups).',
        '`GET /users/me/username` — current name + `canChangeNow` / `nextChangeAt`. `PATCH /users/me/username` — **first change is instant, then once every 7 days**.',
        '`GET /users/username-available?username=` — validity + availability check.',
        '',
        '### Notifications (new job)',
        'Settings: `GET|PATCH /users/me/notification-settings` → `{ push, email }` (defaults `push: true`, `email: false`).',
        'When a job is created, every user whose `filter_preferences` contain **any** of the job\'s filters (except the creator) gets **one** notification',
        '(never one per filter): text `Job created in <matched filters> filter(s)`, sent via Firebase push and/or email per their settings.',
        'Push `data` payload (all strings): `type=job_created, jobId, title, text, createdAt, filterIds, filterIcon, filters (JSON), isRemote, salaryType, salaryAmount, currency, pageName, pageId, path`.',
        '`path` = deep link the app opens on tap (configured by env `NOTIFICATION_JOB_PATH`, `{id}` = job id; default `/job/{id}`).',
        'Test push from this page: click **Get FCM token** (bottom-right) → copy token → send it as `fcmToken` in `POST /auth/login`. Needs `FIREBASE_WEB_*` env.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT from login / register / google / facebook',
      },
      'JWT',
    )
    .addTag('Health', 'App health check')
    .addTag('Auth', 'Register, login, social (kyc_token until phone OTP), KYC, email update')
    .addTag('Users', 'Profile, filter_preferences (min 4, max 30) & notification settings')
    .addTag('Countries', 'Country list')
    .addTag('Languages', 'Language CRUD')
    .addTag('Cities', 'Cities (seeded for Pakistan)')
    .addTag(
      'Filters',
      'Job categories. Tabler/custom icons. Cache via last_update_time. Optional JWT for preferred-first.',
    )
    .addTag('Jobs', 'Job posts — multi filterIds (1–10)')
    .addTag('Job Applications', 'Apply & manage applications')
    .addTag('Organization', 'Organizations & members')
    .addTag('Pages', 'Pages (company profiles): roles, invitations, verification')
    .addTag('Chat', 'Application chat messages')
    .addTag('Ratings', 'Rate after job application')
    .addTag('Files', 'File upload')
    .addTag('Firebase', 'Push notification helpers')
    .build();

  // Dev helper: "Get FCM token" button on /docs (needs FIREBASE_WEB_* env)
  const fcmWebConfig = readFcmWebConfig();
  app
    .getHttpAdapter()
    .get('/firebase-messaging-sw.js', (_req: any, res: any) => {
      res
        .type('application/javascript')
        .send(buildServiceWorker(fcmWebConfig));
    });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customJsStr: buildFcmButtonScript(fcmWebConfig),
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'JobsLoot API Docs',
  });
}
