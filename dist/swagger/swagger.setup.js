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
        '### Job applications',
        '`POST /job-application` - once per job per user (not your own job). The job owner is notified **in a batch, not instantly**:',
        'applications are queued, ~30s later ONE push/email is sent (`3 people applied to your job "X" (12 total)`), busy jobs get at most one every ~2 min.',
        '',
        '### Social: profile, follow, posts & reels, discover',
        '**Profile** (LinkedIn style): `GET|PATCH /users/me/profile` (headline, about, skills, links, open to work) and `POST|PATCH|DELETE /users/me/experience|education|certifications`. Anyone\'s public profile: `GET /users/:id/profile` (never shows contact details or documents).',
        '**Follow** users and pages: `POST|DELETE /users/:id/follow`, `/pages/:id/follow`; lists `GET /users/:id/followers|following`, `/pages/:id/followers` (cursor paging).',
        '**Posts & reels** are one thing with a `kind`. Upload files with `POST /media/upload`, then publish with `POST /posts` (as yourself, or as a page with `pageId`; tag a job with `jobId`; `#hashtags` become searchable). Feeds: `GET /posts/feed` (people/pages I follow), `GET /reels/feed` (discover reels), `GET /users/:id/posts`, `GET /pages/:id/posts`.',
        '**Engagement**: `POST|DELETE /posts/:id/like`, `POST /posts/:id/comments` (+ replies), `POST /posts/:id/share`. Likes/comments/follows notify the owner **in batches** ("Ali and 4 others liked your reel"), never one push each.',
        '**Analytics**: the app reports `POST /posts/events` (batched impressions/views); owners read `GET /posts/:id/analytics` and `GET /analytics/overview` (page: `?pageId=`).',
        '**Discover**: `GET /discover/home`, `/discover/search`, `/discover/users|pages|posts|reels|hashtags`.',
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
        .addTag('Pages', 'Pages (company profiles): roles, invitations, verification')
        .addTag('Profile', 'LinkedIn-style profile: headline, about, experience, education, certifications')
        .addTag('Follow', 'Follow users and pages, followers / following lists')
        .addTag('Media', 'Upload images and videos for posts and reels')
        .addTag('Posts & Reels', 'Publish, feeds, likes, comments, shares')
        .addTag('Analytics', 'Views reporting and performance of posts / reels')
        .addTag('Discover', 'Search people, pages, posts, reels, hashtags; trending and suggestions')
        .addTag('Chat', [
        'Two kinds of chat: **direct** (DM to any user) and **job** (one thread per applicant per job).',
        'Job chat: for a personal job the poster answers; for a page job the page owner and every current admin / editor answer in the same thread (removed members lose access at once).',
        '',
        '### Live updates: Socket.io',
        'Swagger cannot show sockets, so they are described here. Namespace **`/chat`**, same host and port as the API (e.g. `io("http://localhost:3000/chat", { auth: { token: "<JWT>" } })`). No token = disconnected.',
        'Every connection joins the personal room `user:{id}` automatically, so there is nothing to join for the inbox.',
        '',
        '**Server -> app (listen)**',
        '- `message:new` `{ conversationId, message }` - a new message (also echoed to your own other devices; dedupe by `message.id`)',
        '- `message:deleted` `{ conversationId, messageId }`',
        '- `conversation:read` `{ conversationId, userId, lastReadMessageId }` - someone read up to that id (use it for read ticks)',
        '- `typing` `{ conversationId, userId, isTyping }`',
        '',
        '**App -> server (emit, each with an ack callback)** - ack is `{ ok: true, ... }` or `{ ok: false, error, status }`',
        '- `conversation:send` `{ conversationId, content?, mediaUrl?, messageType?, clientMsgId? }` -> `{ ok, message }` (same rules as `POST /chat/conversations/:id/messages`)',
        '- `conversation:typing` `{ conversationId, isTyping }`',
        '- `conversation:read` `{ conversationId, messageId? }` (default: latest) -> `{ conversationId, lastReadMessageId }`',
        '',
        '### Typical flow',
        '1. `POST /chat/conversations` (`{type:"job",jobId}` or `{type:"direct",userId}`) -> conversation id',
        '2. `GET /chat/conversations/:id/messages` -> history (scroll up with `before=<nextCursor>`)',
        '3. Send with the socket event (or REST as fallback), listen to `message:new`',
        '4. After reconnecting, catch up with `GET .../messages?after=<lastSeenId>` and refresh `GET /chat/unread-count`',
        '5. Offline people get one merged push ("3 new messages"); nothing is sent if they read it within a few seconds',
        '',
        '### Old application chat (kept for old app versions)',
        'Socket `joinApplication` / `sendMessage` -> `newMessage` and `GET /chat/application/:id/messages` still work. They use the same job chat, so old and new apps see the same messages.',
        '',
        'Try it live with the lab page `/chat-lab.html` (two accounts side by side).',
    ].join('\n'))
        .addTag('Notifications', [
        'The bell screen: the personal notification list of the signed-in person.',
        'Everything that is pushed to a person is also saved here (even when push / email is off), so a missed push is never lost. Chat messages are not in this list: they use the chat inbox.',
        '',
        '**Live (optional)**: on the socket namespace `/chat` (see the Chat section) the app also receives `notification:new` `{ notification }` (`notification` is `null` for bulk alerts such as a new job: just refresh the badge / list) and `notification:read` `{ ids }` or `{ all: true }` (another device read them).',
        '',
        'Typical flow: `GET /notifications/unread-count` for the badge, `GET /notifications` for the screen (infinite scroll with `before=<nextCursor>`), `POST /notifications/:id/read` when one is opened, open `path` (deep link) from the item.',
    ].join('\n'))
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