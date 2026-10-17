# JobsLoot — Project Map

Quick orientation for humans and AI assistants. **Read this first instead of
re-scanning the codebase.** Keep it updated when structure, routes, entities or
conventions change (see "Maintenance" at the bottom).

_Last verified: 2026-10-16 (after the notifications feature)._

## What it is

Backend API for a job marketplace mobile app (React Native). Users post jobs in
categories ("filters"), search them (by category / text / nearby), apply, chat
per application, and rate each other after acceptance. Companies can have
"pages" that post jobs.

- **Stack:** NestJS 10, TypeORM + MySQL 8 (spatial `POINT`), JWT (`@nestjs/jwt`,
  365d), Joi validation, Socket.io, Firebase Admin (FCM push), Twilio, Swagger.
- **Swagger UI:** `http://localhost:3000/docs` (it is `/docs`, not `/doc`).
  **Every API change must update the Swagger decorators/text** (`@ApiOperation`,
  `@ApiBody`, `@ApiQuery`, and `src/swagger/swagger.setup.ts`).
- **Run:** `npm run start:dev` (watch) · `npm run start` (no watch!) · build
  `npm run build`. Port **3000**. Global throttle: 10 req / 30 s per IP.
- **Env (`.env`, gitignored):** `DB_HOST DB_PORT DB_USERNAME DB_PASSWORD
  DB_DATABASE JWT_SECRET GOOGLE_* FACEBOOK_* TWILIO_* ` + Firebase service
  account (`src/firebase/*.json`, gitignored).
- **`dist/` is committed to git.** After changing `src/`, run `npx nest build`
  and commit `dist/` together with `src/`.
- Windows dev machine; local DB is Laragon MySQL (`DB_DATABASE` ends in
  `_staging`). Prettier reformats whole files — only format files you changed.

## Folder map

```
src/
  main.ts                  bootstrap: AllExceptionsFilter, CORS, /uploads + /public static, Swagger
  app.module.ts            TypeORM (forRootAsync, synchronize:true) + all modules + global ThrottlerGuard
  auth/                    register/login/social/KYC/link-identity/forgot-password (biggest: auth.service ~1100 lines)
  users/                   User + work_experience/education/certifications/auth_identities entities, /users/me
  job/                     jobs CRUD + search (geo + category) + migrate-legacy-filter-column.ts
  job-application/         apply, my applications, applications per job, status update
  chat/                    Socket.io gateway (namespace /chat) + REST message history
  rating/                  rate user after accepted application
  filter/                  job categories (+ icon, approval status); seed data
  pages/                   company pages + members/roles (jobs can belong to a page)
  organization/            older org/members concept (similar to pages)
  country/ city/ language/ reference data + seed commands
  files/                   multer upload -> ./uploads, served at /uploads
  firebase/                FCM wrapper: sendToTokens (chunked multicast), legacy filter topics
  notification/            new-job notifications: NotificationService, MailService (SMTP), settings types
  otp/ twilio/             OTP store (in-memory, DEV fixed codes) + SMS
  common/                  AllExceptionsFilter, JoiValidationPipe, utils
  commands/                seed-* CLI entrypoints (npm run seed:*)
  swagger/swagger.setup.ts Swagger description text + tags
public/google-login.html   auth test lab        chat-test.html  socket chat tester
frontend/theme/            purchased admin HTML template (unused, not wired)
test/                      e2e scaffold only (auth.service.spec.ts is the one real unit test)
```

## Auth model

- JWT payload is `{ id }` only. `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`)
  reads `Authorization: Bearer`, sets `req.user = { id }`.
- Register: `POST /auth/register/send-otp` → `verify-otp` (phone OTP; email OTP
  too if email given). **OTPs are fixed dev codes** (`123456` phone, `654321`
  email) and returned in the response; stored in memory (`OtpService`).
- Login: phone or email + password (PBKDF2 hash+salt on user).
- Google/Facebook: `POST /auth/google|facebook` → existing user gets token; new
  user gets `kyc_token` → must finish phone OTP via `/auth/kyc/send-otp|verify-otp`.
  Extra social identities live in `user_auth_identities`; linking needs
  `/auth/link-identity/confirm`. Legacy `googleId/facebookId` columns mirror primary.
- `GET/DELETE /auth/debug/accounts` are **unauthenticated** (blocked only when
  `NODE_ENV=production`).

## Routes (all under `/docs`)

| Area | Routes | Guard |
|---|---|---|
| auth | `POST /auth/register/send-otp, register/verify-otp, login, google, facebook, kyc/send-otp, kyc/verify-otp, link-identity/confirm, forgot-password/send-otp, forgot-password/verify-otp`; `update-email/send-otp, update-email/verify-otp` (JWT); debug endpoints | mostly public |
| users | `PATCH /users/me`, `GET /users/me/preferences`, `GET|PATCH /users/me/notification-settings`, `GET|PATCH /users/me/username`, `GET /users/username-available` | JWT |
| jobs | `POST /job`, `GET /job`, `GET /job/:id`, `PATCH /job/:id` | JWT |
| applications | `POST /job-application`, `GET /my`, `GET /job/:jobId`, `PATCH /:id/status` | JWT |
| chat | `GET /chat/application/:id/messages`; WS ns `/chat`: `joinApplication`, `sendMessage` → emits `newMessage` | JWT (WS: token in handshake) |
| ratings | `POST /ratings` | JWT |
| filters | `GET /filters`, `GET /filters/:id` (optional Bearer → preferred first) | public |
| pages | `POST/GET /pages`, `GET/PATCH/DELETE /pages/:id`, members add/remove/role | JWT |
| organization | `POST /organization`, `GET`, `POST /member`, `DELETE /member/remove` | JWT |
| files | `POST /files/upload` | **none** |
| firebase | `GET /firebase/test-notification`, `POST /firebase/subscribe-filter` | none |
| country/city/language | `GET /countries, /cities, /languages` (+`:id`; languages also POST/PATCH/DELETE) | none |

## Database (MySQL, `synchronize: true` — entities ARE the schema)

Relationships to remember:

- `jobs` ←M2M→ `filters` via **`job_filters`** (`jobId`,`filterId`). This is the
  **only** place a job's categories live. The old `jobs.filterId` column was
  **dropped** (commit `badeb37`); `src/job/migrate-legacy-filter-column.ts`
  copies legacy data and runs inside the TypeORM factory before `synchronize`.
- `jobs.location` is a MySQL `POINT` (SRID 4326), `null` for remote jobs. Never
  `save()` a Job with a location — writes use `QueryBuilder.insert/update` with a
  raw `ST_GeomFromText('POINT(lng lat)', 4326, 'axis-order=long-lat')`.
  `jobs.pageId` → `pages` (optional); `jobs.createdBy` → `users`.
- `job_applications` (jobId, applicantId, status pending|accepted|rejected) →
  has many `chat_messages` and `ratings` (unique per application+rater).
- `users` → many `work_experience`, `education`, `certifications`,
  `user_auth_identities`, `applications`, `jobs`; ManyToOne country/city/language
  (eager). `users.filter_preferences` = number[] (category ids). `users.fcmTokens`.
- `filters`: `icon` JSON `{type:'tabler',name}` | `{type:'custom',svg}`,
  `approvalStatus` pending|approved|rejected, `status` active|inactive.
- `pages` ↔ `page_members` (owner|admin|editor); `organizations` ↔ `org_members`.

## Jobs — key behaviours (`src/job/job.service.ts`)

- **Create/update** take `filterIds` (1–10, must be active+approved) or legacy
  `filterId` (treated as `[id]`). Multipart or JSON; `parseJobBody` coerces
  strings. Max 4 pictures. On-site jobs require `location {lat,lng}`; remote
  (`isRemote:true`) doesn't. FCM push goes to each `filter_<id>` topic.
- **Response shape** for every job: `filters: [{id,name,icon}]` and
  `filterIds: number[]` (no `filter` / `filterId` any more). Built by
  `jobCategories()`.
- **`GET /job`** query: `myjobs=true` (own jobs, active+inactive), `filter=1,2`,
  `search` (description LIKE), `lat`+`lng`, `radiusKm`, `page`, `limit` (max
  100), `sortBy` (whitelist: id, createdAt, updatedAt, title, salaryAmount,
  startDate, endDate; `distance` only with lat/lng), `sortOrder`.
  - `lat`+`lng` (and not `myjobs`) → `findNearbyJobs` (raw SQL, parameterized).
    Adds `distance` (meters; null for remote jobs).
  - **`radiusKm` is opt-in**: no default radius. If sent, only jobs within it
    (remote jobs excluded then).
  - Category filtering uses `EXISTS` on `job_filters`.
- `GET /job/:id` only returns `isActive` jobs.

## Job applications & batched employer notifications

- `POST /job-application {job}`: once per user per job (job row locked in a
  transaction, so parallel taps create one application), not own job. No DB
  unique index on (jobId, applicantId) on purpose - production data may hold
  old duplicates and `synchronize` would crash; check with
  `SELECT jobId, applicantId, COUNT(*) FROM job_applications GROUP BY 1,2 HAVING COUNT(*)>1`
  and add `@Unique` once clean.
- Employer (`jobs.createdBy`) is NOT pinged instantly. `ApplicationNotifier`
  (`src/job-application/application-notifier.ts`) queues each application in the
  generic durable queue (`notification_queue` table, `NotificationQueueService`
  in `src/notification/`). A worker polls every 5s: a group (`job_application:<jobId>`)
  is flushed `APPLICATION_NOTIFY_DELAY_SECONDS` (30) after its FIRST queued item,
  at most one notification per job every `APPLICATION_NOTIFY_MIN_GAP_SECONDS` (120),
  merged into one message ("3 people applied to your job "X" (12 total)", or
  "<name> applied ..." for one). Push/email follow the employer's
  `notification_settings`. Push data: `type=job_application, jobId, jobTitle, title,
  text, count, totalApplications, applicantIds, applicantNames, applicationId,
  createdAt, path` (`path` from env `NOTIFICATION_APPLICATION_PATH`, default
  `/job/{id}/applications`).
- Queue: DB-backed (survives restarts, multi-instance safe via atomic claim),
  3 retries with backoff, stuck claims released after 5 min, processed rows
  deleted after 7 days. `NOTIFICATION_WORKER=off` disables the worker on an
  instance; `NOTIFICATION_QUEUE_POLL_SECONDS` sets polling. New batched types:
  `queue.register(type, {delaySeconds, minGapSeconds, handler})` + `queue.enqueue(...)`.
- FCM lab (`/fcm-lab.html`, section 5) lists jobs (with whether the employer can
  receive a push), applies to a job as the ticked applicants through the real
  `JobApplicationService.apply`, and shows the queue live (countdown + per-row
  push result stored in `notification_queue.note`). Non-`[FCM TEST]` jobs need
  confirmation (real employer would be notified); test jobs can be Activated/
  Hidden and Reset (deletes their applications + queue rows).
- Page-owned jobs notify only the poster (`createdBy`), not page members.
- For very high volume swap the worker for BullMQ + Redis; the handler stays.

## Accept/reject & ratings (`job-application/`, `rating/`)

- "Employer side" of a job = the poster, or for a page job the page owner /
  member with role owner|admin|editor (`src/job/job-employer.util.ts` ->
  `isJobEmployer`). Only they may list applicants (`GET /job-application/job/:id`,
  applicant objects stripped of private fields) and decide applications; they
  also cannot apply to that job.
- `PATCH /job-application/:id/status {status: accepted|rejected}`: only from
  `pending`, final, atomic (`decidedAt`/`decidedBy` stored). **Accepted ->
  `ApplicationNotifier.notifyAccepted`** sends push/email to the applicant right
  away (per their notification settings); rejected sends nothing. Push data:
  `type=application_accepted, applicationId, jobId, jobTitle, title, text,
  companyName, pageId, createdAt, path` (`path` from env
  `NOTIFICATION_APPLICATION_ACCEPTED_PATH`, default `/application/{id}`).
- Ratings (`POST /ratings`) only on accepted applications, ONE per side
  (`ratings.direction` = `employee_to_employer` | `employer_to_employee`, unique
  per application+direction; old rows backfilled at startup).
  - employer side rates the applicant -> applicant's profile rating.
  - applicant rates a PERSONAL job's poster -> poster's profile rating.
  - applicant rates a PAGE job -> the COMPANY (`ratings.pageId`, `givenTo` null,
    `pages.company_rating` float + `company_rating_count`), not the person.
  - Profile rating (`users.ratingAverage/ratingCount`) = pooled average of every
    rating received as employee AND employer. `GET /ratings/user/:id` also
    returns `asEmployee` / `asEmployer` splits; `GET /ratings/company/:pageId`;
    `GET /ratings/application/:id` = rating-screen state (`canRate`, `iRated`...).

## Username (`src/users/username.util.ts`, `users.service.ts`)

- `users.username` (varchar 30, unique, nullable only for the instant before
  backfill) and `usernameChangedAt`. Generated at registration by
  `generateUniqueUsername` = first+last name (latin letters/digits, max 20, else
  `user`) + `_` + 5 random chars, in both phone register (`createOrGetUser`) and
  social KYC signup. `AuthService.onModuleInit` backfills users without one.
- User can change it via `PATCH /users/me/username`: the FIRST change is instant
  (`usernameChangedAt` null; the generated name doesn't count), then once every
  7 days (`USERNAME_COOLDOWN_DAYS`). Rules `USERNAME_PATTERN`: 3-30 chars
  `a-z 0-9 . _`, starts/ends alphanumeric, no repeated `.`/`_`. Taken -> 409.
  `PATCH /users/me` cannot change it.

## Notifications (`src/notification/`)

- User setting `users.notification_settings` (JSON, null = defaults):
  `{ push: boolean, email: boolean }`, defaults `push:true, email:false`.
  `GET|PATCH /users/me/notification-settings`; enabling email needs an account
  email (400 otherwise). New channels: add to `notification-settings.ts`, the Joi
  schema in `users.controller.ts`, and a sender in `NotificationService`.
- On job create, `JobService` calls `NotificationService.notifyJobCreated(job)`
  (fire-and-forget, never throws). Recipients = users whose `filter_preferences`
  contain ANY of the job's filters (`FIND_IN_SET`), minus the creator and banned
  users. **One notification per user** (never per filter); text is
  `Job created in <filters matched for that user> filter(s)`. Users are grouped by
  matched-filter set, push goes via `FirebaseService.sendToTokens`, email via
  `MailService` per user.
- Push `data` payload (all strings): `type=job_created, jobId, title, text,
  createdAt, filterIds, filterIcon, filters(JSON), isRemote, salaryType,
  salaryAmount, currency, companyName, pageId, path`. Custom SVG icons send only
  `{type:'custom'}` (FCM 4KB limit). `path` = deep link from env
  `NOTIFICATION_JOB_PATH` (`{id}` placeholder, default `/job/{id}`) — to be
  configured with the app.
- Email: SMTP via nodemailer. Env `SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER
  SMTP_PASS MAIL_FROM`. **If `SMTP_HOST` is unset emails are only logged**, not
  sent. The old per-filter FCM topic send on job create was removed (it would
  duplicate and notify the creator); topic subscription code still exists.
- Not done: stale FCM tokens aren't pruned; no notification history table.
- `/docs` has a floating **Get FCM token** button (`src/swagger/fcm-token-button.ts`)
  that returns the browser's FCM token (+ copy, send test push). Needs the
  Firebase WEB app config in env: `FIREBASE_WEB_API_KEY`, `FIREBASE_WEB_APP_ID`,
  `FIREBASE_WEB_MESSAGING_SENDER_ID`, `FIREBASE_WEB_VAPID_KEY`
  (`FIREBASE_WEB_PROJECT_ID` optional). Service worker is served at
  `/firebase-messaging-sw.js` (from `setupSwagger`). https or localhost only.
- **Firebase credentials** (server): loaded by `src/firebase/service-account.loader.ts`,
  first match wins: env `FIREBASE_SERVICE_ACCOUNT_JSON` (raw or base64) ->
  env `FIREBASE_SERVICE_ACCOUNT_PATH` -> `src/firebase/service-account.json`
  (git-ignored; `nest build` copies it to `dist/firebase/`) -> legacy staging
  file. Current project: `jadeedjob-5210d`. Tokens saved from another Firebase
  project fail with sender-id-mismatch; the app must use the same project.
  `FIREBASE_WEB_*` (for the /docs token button) must be that project's web app.
- **FCM lab** (`public/fcm-lab.html` + `src/debug/fcm-lab.controller.ts`, routes
  `/debug/fcm/*`, hidden from Swagger): user list with FCM tokens, test push per
  user/raw token (per-token FCM error + hint), "who would be notified and why not"
  preview, and create-test-job (notifies only the ticked recipients unless
  `notifyAllMatching`; job is deactivated afterwards). Works in production but
  only when env `DEBUG_LAB_KEY` is set (sent as header `x-debug-key`); unset = 404.
  `NotificationService.notifyJobCreated` returns a summary (push ok/failed per
  FCM error code, email counts).
- Sending is NOT queued: it runs in-process right after job creation (fire and
  forget, no retry, lost if the process dies). FCM itself (Google) stores/delivers
  to devices and has very high quotas; our side is the weak point under heavy
  traffic. Fix when needed: job queue (BullMQ + Redis) with retries/backoff and a
  separate worker.
- `GET /users/me/notification-settings` does not write; the DB column stays
  NULL (= defaults) until the first `PATCH`.

## Conventions

- Validation: Joi (`JoiValidationPipe` or schemas in `job.validation.ts`), not
  class-validator, in most controllers.
- Errors: `AllExceptionsFilter` returns `{statusCode,error,message,details?,path,timestamp}`.
- Imports use both `src/...` aliases and relative paths.
- Seed: `npm run seed:filters|countries|languages|cities`.
  Manual legacy migration: `npm run migrate:job-filters`.
- Commits: end with the Co-Authored-By line required by the session; commit
  `src/` and rebuilt `dist/` together.

## Known issues / not done (as of last verified)

- Authorization gaps: `PATCH /job-application/:id/status` and
  `GET /job-application/job/:jobId` don't check the caller owns the job;
  `/files/upload` and `/firebase/*` are public.
- OTP is a hardcoded dev code (no real SMS/email); OTP store is in-memory.
- `synchronize: true` in production is risky (use migrations eventually).
- `JoiValidationPipe` via method-level `@UsePipes` runs per-parameter, so
  schemas that include `id` + body fields may not validate as intended.
- Debug auth endpoints are open outside production.
- `GET /job/:id` filters `isActive` but doesn't check ownership for inactive jobs.

## Testing locally (what works)

- Server on 3000 is often started by the user with `nest start` (no watch) —
  restart it to pick up changes. To test new code without touching it, build and
  run a second instance on another port (the scratchpad `run3100.js` pattern:
  load `.env`, `NestFactory.create(AppModule)` from `dist/`, listen 3100).
- Make a JWT for user id 29 from `JWT_SECRET` (`jsonwebtoken`) to call guarded
  routes. Mind the 10 req / 30 s throttle.
- `mysql` client: `/c/laragon/bin/mysql/mysql-8.4.3-winx64/bin/mysql`.
- Local DB has test jobs titled `TEST ...` (ids 1–4); safe to delete.

## Maintenance

When you change routes, entities, response shapes, env vars or conventions,
update this file in the same commit (and keep Swagger in sync).
