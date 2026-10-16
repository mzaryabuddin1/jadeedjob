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
| users | `PATCH /users/me`, `GET /users/me/preferences`, `GET|PATCH /users/me/notification-settings` | JWT |
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
