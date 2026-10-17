"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
const fcm_token_button_1 = require("./fcm-token-button");
function setupSwagger(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('JobsLoot API')
        .setDescription([
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
        '### Username',
        'Auto-generated at registration (first + last name + random string, e.g. `alikhan_k3f9a`), unique per user (also for Google/Facebook signups).',
        '`GET /users/me/username` — current name + `canChangeNow` / `nextChangeAt`. `PATCH /users/me/username` — **first change is instant, then once every 7 days**.',
        '`GET /users/username-available?username=` — validity + availability check.',
        '',
        '### Notifications (new job)',
        'Settings: `GET|PATCH /users/me/notification-settings` → `{ push, email }` (defaults `push: true`, `email: false`).',
        'When a job is created, every user whose `filter_preferences` contain **any** of the job\'s filters (except the creator) gets **one** notification',
        '(never one per filter): text `Job created in <matched filters> filter(s)`, sent via Firebase push and/or email per their settings.',
        'Push `data` payload (all strings): `type=job_created, jobId, title, text, createdAt, filterIds, filterIcon, filters (JSON), isRemote, salaryType, salaryAmount, currency, companyName, pageId, path`.',
        '`path` = deep link the app opens on tap (configured by env `NOTIFICATION_JOB_PATH`, `{id}` = job id; default `/job/{id}`).',
        'Test push from this page: click **Get FCM token** (bottom-right) → copy token → send it as `fcmToken` in `POST /auth/login`. Needs `FIREBASE_WEB_*` env.',
    ].join('\n'))
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste JWT from login / register / google / facebook',
    }, 'JWT')
        .addTag('Health', 'App health check')
        .addTag('Auth', 'Register, login, social (kyc_token until phone OTP), KYC, email update')
        .addTag('Users', 'Profile, filter_preferences (min 4, max 30) & notification settings')
        .addTag('Countries', 'Country list')
        .addTag('Languages', 'Language CRUD')
        .addTag('Cities', 'Cities (seeded for Pakistan)')
        .addTag('Filters', 'Job categories. Tabler/custom icons. Cache via last_update_time. Optional JWT for preferred-first.')
        .addTag('Jobs', 'Job posts — multi filterIds (1–10)')
        .addTag('Job Applications', 'Apply & manage applications')
        .addTag('Organization', 'Organizations & members')
        .addTag('Pages', 'Company pages')
        .addTag('Chat', 'Application chat messages')
        .addTag('Ratings', 'Rate after job application')
        .addTag('Files', 'File upload')
        .addTag('Firebase', 'Push notification helpers')
        .build();
    const fcmWebConfig = (0, fcm_token_button_1.readFcmWebConfig)();
    app
        .getHttpAdapter()
        .get('/firebase-messaging-sw.js', (_req, res) => {
        res
            .type('application/javascript')
            .send((0, fcm_token_button_1.buildServiceWorker)(fcmWebConfig));
    });
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        customJsStr: (0, fcm_token_button_1.buildFcmButtonScript)(fcmWebConfig),
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
//# sourceMappingURL=swagger.setup.js.map