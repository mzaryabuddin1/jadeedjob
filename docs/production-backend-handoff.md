# JobsLoot Production Backend Handoff

Last verified: 2026-07-29

## Deployment Order

1. Back up the target database.
2. Set `DB_SYNCHRONIZE=false`.
3. Run `npm run migration:show`.
4. Run `npm run migration:run`.
5. Run `npm run migration:show` again. Every migration must be marked `[X]`.
6. Configure Redis, private S3-compatible storage, Firebase, Twilio, social
   providers, JWT secrets, CORS origins, and `APP_URL`.
7. Run `npm run build` and start with `npm run start:prod`.
8. Verify `/`, `/docs-json`, authentication, a signed asset URL, push delivery,
   and a two-client socket exchange.

The production migration is:

```text
src/database/migrations/1785342156433-ProductionBackendCompletion.ts
```

It is additive and resumable. It preserves existing data and backfills legacy
applications, messages, ratings, support messages, and push devices. Its `down`
method is intentionally disabled because restoring the pre-migration backup is
safer than destructively reversing populated production data.

## Common API Rules

Protected requests use:

```http
Authorization: Bearer <accessToken>
```

Send a stable per-installation identifier during login and registration:

```json
{
  "installationId": "stable-device-installation-id",
  "platform": "ios",
  "deviceName": "iPhone",
  "appVersion": "1.0.0",
  "locale": "en-PK"
}
```

Standard error shape:

```ts
{
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: unknown;
  errors?: string[];
  path: string;
  timestamp: string;
}
```

Important stable codes include:

```text
AUTH_SESSION_INVALID
AUTH_SOCIAL_PHONE_REQUIRED
ACCOUNT_PENDING_DELETION
PROFILE_BLOCKED
CHAT_READ_ONLY
APPLICATION_VACANCIES_FILLED
RATE_LIMIT_EXCEEDED
VALIDATION_FAILED
FORBIDDEN
NOT_FOUND
CONFLICT
```

## Authentication

These successful flows now return the same session response:

```http
POST /auth/login
POST /auth/register/verify-otp
POST /auth/password-change/verify-otp
POST /auth/google
POST /auth/facebook
POST /auth/social/phone/verify-otp
POST /auth/account-recovery/confirm
```

```ts
{
  accessToken: string;
  access_token: string; // temporary compatibility alias
  refreshToken: string;
  accessTokenExpiresIn: 900;
  sessionId: string; // UUID
  profile: PublicCurrentUser;
}
```

Access tokens expire after 15 minutes. Refresh tokens expire after 30 days and
rotate every time they are used.

### Refresh And Logout

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<sessionId>.<randomSecret>" }
```

Success returns the full session response with a new refresh token. Replace both
stored tokens atomically. Reusing an old rotated refresh token revokes that
session.

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

```json
{ "message": "Logged out successfully" }
```

```http
POST /auth/logout-all
Authorization: Bearer <accessToken>
```

```json
{ "message": "Logged out from all devices successfully" }
```

Password reset/change, admin bans, logout-all, and account deletion increment
`tokenVersion` and invalidate older access tokens and sessions.

### Social Login

```http
POST /auth/google
{ "idToken": "...", ...deviceFields }

POST /auth/facebook
{ "accessToken": "...", ...deviceFields }
```

An already linked identity returns the normal session response. A new identity
returns HTTP `202`:

```ts
{
  code: "AUTH_SOCIAL_PHONE_REQUIRED";
  message: string;
  socialVerificationToken: string; // short lived and one use
  providerProfile: {
    provider: "google" | "facebook";
    name: string | null;
    email: string | null;
    avatarUri: string | null;
  };
}
```

Complete a new social identity with:

```http
POST /auth/social/phone/send-otp
{
  "socialVerificationToken": "...",
  "phone": "..."
}

POST /auth/social/phone/verify-otp
{
  "socialVerificationToken": "...",
  "phone": "...",
  "otp": "...",
  ...deviceFields
}
```

Forgot password remains phone-only:

```http
POST /auth/forgot-password/send-otp
POST /auth/forgot-password/verify-otp
```

## Canonical Chat

`conversationId` is a UUID and is the canonical identifier. Responses also
return `chatId` with the same UUID during the compatibility period.

### REST

```http
GET /chats?page=1&limit=20
```

```ts
{
  data: Array<{
    conversationId: string;
    chatId: string;
    type: "application" | "inquiry" | "invitation";
    jobId: number | null;
    applicationId: number | null;
    participant: PublicProfileSummary | null;
    job: JobSummary | null;
    lastMessage: ChatMessage | null;
    unreadCount: number;
    readOnly: boolean;
    readOnlyReason: string | null;
  }>;
  total: number;
  totalPages: number;
  currentPage: number;
}
```

```http
GET /chats/:conversationId/messages?before=<sequence>&limit=20
```

```ts
{
  data: ChatMessage[];
  nextBefore: string | null;
  total: number;
  totalPages: number;
  currentPage: number;
  readOnly: boolean;
  readOnlyReason: string | null;
}
```

```ts
type ChatMessage = {
  id: string; // legacy rows keep their former numeric ID as a string
  sequence: number;
  conversationId: string;
  chatId: string;
  applicationId: number | null;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  text: string | null;
  messageType: "text" | "image" | "video" | "audio" | "file";
  attachments: Array<{
    assetId?: string;
    fileUrl: string;
    fileName?: string;
    contentType?: string;
  }>;
  createdAt: string;
  readAt: string | null;
}
```

Send a retry-safe message:

```http
POST /chats/:conversationId/messages
{
  "text": "Hello",
  "clientMessageId": "<stable UUID generated by the client>",
  "attachments": []
}
```

Upload an attachment:

```http
POST /chats/:conversationId/attachments
Content-Type: multipart/form-data

file=<binary>
```

```ts
{
  message: string;
  attachment: {
    assetId: string;
    fileName: string;
    fileUrl: string; // short-lived signed URL outside development
    contentType: string;
    sizeBytes: number;
  };
}
```

```http
PATCH /chats/:conversationId/read
```

```ts
{
  chatId: string;
  conversationId: string;
  lastReadMessageId: string | null;
  lastReadSequence: number | null;
  readAt: string;
}
```

The mobile read-receipt comparison must use `message.sequence <=
lastReadSequence`. Treat message IDs as opaque strings and never pass them
through `Number()`.

Get profile-specific chat actions and valid jobs:

```http
GET /profiles/:profileType/:profileId/chat-options
```

```ts
{
  available: boolean;
  action: "invite" | "inquiry";
  jobs: Array<{ id: string; title: string; companyName?: string }>;
  unavailableReason?: string;
}
```

Create a context:

```http
POST /chats/contexts
Idempotency-Key: <stable client request UUID>

{
  "action": "invite",
  "profileType": "user",
  "profileId": 83,
  "jobId": 10,
  "clientRequestId": "<same stable UUID>"
}
```

The response contains `conversationId`, `chatId`, job/profile context, and an
invitation when the action is `invite`. Every invitation projection includes:

```ts
{
  id: string; // compatibility alias
  invitationId: string;
  status: string;
  viewerAction: "respond" | "cancel" | null;
}
```

`respond` is returned only to a pending invitee, `cancel` only to the pending
inviter, and `null` after resolution or for inbox viewers without an action.

Respond to an invitation:

```http
PATCH /job-invitations/:invitationId
{ "action": "accept" | "decline" | "cancel" }
```

```ts
{
  invitation: {
    id: string;
    invitationId: string;
    status: string;
    viewerAction: "respond" | "cancel" | null;
    respondedAt: string;
  };
  conversationId: string;
  chatId: string;
  applicationId: number | null;
}
```

### Socket.IO

Connect to namespace `/chat`, path `/socket.io`, with:

```ts
io(`${API_URL}/chat`, {
  path: "/socket.io",
  auth: { token: accessToken }
});
```

Client events:

```text
chat:join
chat:leave
chat:message.send
chat:read
chat:typing
```

Every client mutation acknowledges one of:

```ts
{ ok: true, data: unknown }
{ ok: false, error: { code: string, message: string, details?: unknown } }
```

Server events:

```text
chat:message.created
chat:inbox.updated
chat:read.updated
chat:typing.updated
chat:invitation.updated
```

Use `{ conversationId }` in event bodies. `chatId` is accepted as a temporary
alias. Message sends also require a retry-stable `clientMessageId`.

## Applications And Ratings

Apply with an idempotency key:

```http
POST /job-application
Idempotency-Key: <stable UUID>

{
  "jobId": 10,
  "bidAmount": 1400,
  "bidCurrency": "PKR"
}
```

`bidAmount` is accepted only for negotiable jobs. A withdrawn application is
reused safely when the same worker reapplies.

Allowed transitions:

```text
pending  -> accepted | rejected | withdrawn
rejected -> pending
accepted -> completed
```

Acceptance locks the job row and checks accepted/completed applications against
`vacancies`.

```http
GET /job-application/my?page=1&limit=20&status=pending
GET /job-application/history?status=completed&page=1&limit=20
PATCH /job-application/:id/withdraw
PATCH /employer/job-applications/:id/status
```

List responses use:

```ts
{ data: unknown[]; total: number; totalPages: number; currentPage: number }
```

Ratings:

```http
GET /ratings/application/:applicationId/mine
POST /ratings
{
  "jobApplicationId": 24,
  "stars": 5,
  "comment": "..."
}
```

New ratings require `completed` work and allow one rating per side. The worker
rates the individual employer or company; the employer side rates the worker.
Company profile/job summaries use trusted `ratingAverage` and `ratingCount`,
not legacy `company_rating`.

## Employer Companies

All routes require JWT. Admin review routes additionally require a database
`systemRole=admin`.

```http
GET    /employer/accounts
GET    /employer/companies/select-options
POST   /employer/companies
GET    /employer/companies/search?q=...&page=1&limit=20
POST   /employer/companies/:companyId/access-requests
GET    /employer/companies/:companyId/access-requests
PATCH  /employer/company-access-requests/:requestId
POST   /employer/companies/:companyId/verification-submissions
POST   /employer/companies/:companyId/ownership-transfer
GET    /employer/companies/:companyId
PATCH  /employer/companies/:companyId
```

Company create is multipart:

```text
logo=<optional binary>
verificationDocument=<required binary>
company_name=<required>
verificationProofType=<required>
...other company fields
```

Send `Idempotency-Key` when creating a company or access request. Verification
documents are private stored assets and reads return signed URLs only to
authorized users/admins.

Admin review:

```http
GET   /admin/companies?status=pending&q=&page=1&limit=20
GET   /admin/companies/:companyId
PATCH /admin/companies/:companyId/verification
{
  "status": "approved" | "needs_changes" | "rejected" | "suspended",
  "reason": "..."
}
```

Ownership transfer:

```http
POST /employer/companies/:companyId/ownership-transfer
{
  "newOwnerUserId": 83,
  "currentPassword": "..."
}
```

Public job filtering remains:

```http
GET /job?companyId=:companyId&status=active
```

It exposes only approved companies and active, public jobs.

## Blocking And Reel Reports

```http
GET    /profiles/blocked?page=1&limit=20
POST   /profiles/:profileType/:profileId/block
DELETE /profiles/:profileType/:profileId/block
```

Blocking removes mutual follows, filters the blocked user/company from feeds,
jobs, profiles, notifications, and inbox lists, and prevents new interactions.
Existing explicit chat history remains readable but becomes read-only.

```http
POST /reels/:id/report
{
  "reason": "spam" | "unsafe" | "false_information" | "other",
  "details": "..."
}

GET   /admin/reel-reports?status=pending&page=1&limit=20
PATCH /admin/reel-reports/:reportId
{
  "status": "reviewed" | "dismissed" | "actioned",
  "resolutionNote": "..."
}
```

## Push And Notification Preferences

```http
GET    /users/me/push-devices
POST   /users/me/push-devices
PATCH  /users/me/push-devices/:installationId
DELETE /users/me/push-devices/:installationId
```

Register:

```json
{
  "installationId": "stable-installation-id",
  "token": "<FCM token>",
  "platform": "ios",
  "appVersion": "1.0.0",
  "locale": "en-PK"
}
```

```http
GET   /users/me/notification-preferences
PATCH /users/me/notification-preferences
```

```ts
{
  enabled?: boolean;
  jobs?: boolean;
  applications?: boolean;
  messages?: boolean;
  community?: boolean;
  videos?: boolean;
  company?: boolean;
  support?: boolean;
}
```

In-app notifications are always stored. Push delivery respects category
preferences except security notices. Invalid FCM tokens are deactivated.

## Support Threads

```http
GET  /support/contact-info
POST /support/contact-messages
POST /support/tickets
GET  /support/tickets?page=1&limit=20
GET  /support/tickets/:id
GET  /support/tickets/:id/messages?page=1&limit=20
POST /support/tickets/:id/messages
POST /support/tickets/:id/attachments
```

Authenticated contact requests derive name and phone from the signed-in user.
The first ticket body and legacy attachments are represented as the first thread
message.

Admin:

```http
GET   /admin/support/tickets
GET   /admin/support/tickets/:id
POST  /admin/support/tickets/:id/messages
PATCH /admin/support/tickets/:id/status
```

Ticket statuses are `open`, `in_progress`, `resolved`, and `closed`.

## Account Deletion And Recovery

```http
POST /users/me/deletion/send-otp
POST /users/me/deletion/confirm
{ "otp": "..." }
```

Successful confirmation returns HTTP `202`:

```ts
{
  status: "scheduled";
  scheduledDeletionAt: string;
}
```

Sole company ownership returns `409` with structured blockers. Transfer those
companies through the ownership-transfer endpoint, then retry confirmation.

Recovery during the 30-day grace period:

```http
POST /auth/account-recovery/send-otp
{ "phone": "..." }

POST /auth/account-recovery/confirm
{ "phone": "...", "otp": "...", ...deviceFields }
```

Recovery returns a normal session response. The scheduled task anonymizes due
accounts idempotently after 30 days.

An enumeration-safe public flow is also available for account-deletion pages:

```http
POST /public/account-deletion/send-otp
{ "phone": "..." }

POST /public/account-deletion/confirm
{ "phone": "...", "otp": "..." }
```

The send response is always generic and never returns a development OTP.
Unknown, invalid, used outside the replay window, and expired confirmations all
return `401 ACCOUNT_DELETION_OTP_INVALID`. Valid confirmation uses the same
ownership blockers and schedule as the authenticated flow.

## Legal Documents And Acceptance

No legal content or acceptance is seeded automatically.

```http
GET  /legal/current
GET  /users/me/legal-acceptances
POST /users/me/legal-acceptances
```

```json
{
  "acceptances": [
    { "documentType": "community_guidelines", "version": "approved-version" }
  ],
  "clientPlatform": "ios"
}
```

Publish business-approved metadata explicitly:

```bash
npm run legal:publish -- \
  --type=terms \
  --version=<approved-version> \
  --title=<approved-title> \
  --content-url=<approved-url> \
  --effective-at=<ISO-date> \
  --confirm-db=<database>
```

Activation requires all three conditions: the relevant switch is `true`, its
ISO activation time has arrived, and every required current document exists and
is effective. Registration then requires current Terms and Privacy. Community
Post, Reel, comment, chat message/attachment creation and upload completion then
require current Community Guidelines. Missing acceptance returns
`428 LEGAL_ACCEPTANCE_REQUIRED` with `documentType` and `version`.

```env
LEGAL_REGISTRATION_ENFORCEMENT_ENABLED=false
LEGAL_REGISTRATION_ENFORCEMENT_AT=
LEGAL_COMMUNITY_ENFORCEMENT_ENABLED=false
LEGAL_COMMUNITY_ENFORCEMENT_AT=
```

Keep both switches disabled until approved documents and activation dates are
supplied. Existing users are not assigned fabricated historical acceptance.

## Unified Moderation

Canonical report routes:

```http
POST   /posts/:postId/comments/:commentId/report
DELETE /posts/:postId/comments/:commentId
POST   /reels/:reelId/comments/:commentId/report
DELETE /reels/:reelId/comments/:commentId
POST   /profiles/:profileType/:profileId/report
POST   /chats/:conversationId/messages/:messageId/report
POST   /job/:jobId/report
GET    /admin/moderation/reports
GET    /admin/moderation/reports/:reportId
PATCH  /admin/moderation/reports/:reportId
```

`POST /posts/:id/report`, `POST /reels/:id/report`, and `/admin/reel-reports`
remain compatibility facades. Reports use `{ reason, details? }`; admin actions
use `{ action, notes?, suspensionEndsAt? }`, where action is `dismiss`, `hide`,
`remove`, `warn`, `suspend`, or `ban`. Duplicate active and self reports are
rejected. Comment deletion is soft deletion, and all evidence/audits are
retained.

## Idempotency And Attachments

`Idempotency-Key` remains optional. It is supported for Job, Post, Post video,
Reel initialization, support-ticket, and Post/Reel comment creation. Reusing a
key with the same canonical request replays the original response; a changed
request returns `409 IDEMPOTENCY_CONFLICT`; an active lease returns
`409 IDEMPOTENCY_IN_PROGRESS`. Multipart fingerprints include normalized body,
file checksum, actual size, declared/detected MIME, and filename.

`POST /files/upload` now requires JWT and returns the existing `message`,
`fileName`, and `fileUrl` fields plus `assetId`, `contentType`, and `sizeBytes`.
New chat attachments should send `assetId`. URL-only compatibility accepts only
server-known assets or an attachment already persisted in that conversation;
arbitrary external URLs are rejected.

## Hardening Migrations

The migration order is:

```text
FreshDatabaseBaseline1785000000000
ProductionBackendCompletion1785342156433
AddContentAssetReferences1786352400000
AddUnifiedModerationAndLegal1786518000000
HardenIdempotencyDeletionNotifications1786518060000
```

The fresh baseline only creates wholly missing entity tables with
`CREATE TABLE IF NOT EXISTS`; it executes no ALTER, rename, drop, truncate, or
data rewrite against existing tables. The later migrations are additive and
data-bearing. Run migration and E2E validation only against disposable
`jobsloot_e2e_*` databases before deployment.

## Community Posts Mine Feed

```http
GET /posts?feed=mine&cursor=<cursor>&limit=10
```

```ts
{
  data: CommunityPost[];
  nextCursor: string | null;
}
```

The mine feed includes all posts the current user can still manage across their
personal and company publishers, including published, failed, and recoverable
incomplete media uploads.

## Storage

- Development defaults to local storage and exposes `/uploads`.
- Staging/production require `STORAGE_PROVIDER=s3`.
- S3 objects are private. APIs return short-lived signed read URLs.
- Uploads validate size, declared MIME, actual signature, and extension.
- Stored asset rows include generated keys, checksum, owner, purpose, size,
  content type, provider, and metadata.
- Never persist a signed URL as a durable asset identifier. Persist `assetId`
  where a contract exposes one and request a fresh API representation when the
  URL expires.

## Required Deployment Environment

Start from `.env.production.example`. Staging/production startup fails when a
required enabled feature is not configured.

Required groups:

```text
NODE_ENV
PORT
APP_URL
ALLOWED_ORIGINS
DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE DB_SYNCHRONIZE=false
JWT_SECRET
SOCIAL_CHALLENGE_SECRET
LEGACY_ACCESS_TOKEN_GRACE_UNTIL
REDIS_URL
CHAT_STORAGE_MODE=sql|dual|mongo
MONGODB_URI and MONGODB_CHAT_DATABASE when chat mode is dual or mongo
MONGODB_CHAT_AUTO_INDEX=false
CHAT_AUTH_CACHE_TTL_SECONDS=30
CHAT_SHADOW_COMPARE_SAMPLE_RATE=0.1
STORAGE_PROVIDER=s3
S3_BUCKET S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY
S3_ENDPOINT and S3_FORCE_PATH_STYLE when required by the provider
TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_PHONE_NUMBER
FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_CLIENT_IDS or GOOGLE_CLIENT_ID when Google auth is enabled
FACEBOOK_APP_ID FACEBOOK_APP_SECRET when Facebook auth is enabled
```

### MongoDB chat rollout

MySQL remains authoritative for authentication, users, jobs, applications,
company permissions, blocks, notifications, and job invitations. MongoDB owns
conversation documents, participants, messages, read state, inbox projections,
and the durable chat-notification outbox after cutover. Redis continues to own
Socket.IO fan-out and ephemeral presence.

Use a MongoDB Atlas replica set with TLS, backups, a least-privilege database
user, and only the backend server's static egress IP or private endpoint in the
network access list. Never expose Atlas with `0.0.0.0/0` and never place the
Mongo URI in a mobile build.

Roll out without dropping the SQL chat archive:

```bash
# 1. Deploy with CHAT_STORAGE_MODE=sql and run MySQL migrations.
npm run migration:run

# 2. Inspect the exact migration target without connecting.
npm run migrate:chat-to-mongo -- \
  --dry-run \
  --confirm-sql-db=<mysql-database> \
  --confirm-mongo-db=<mongo-database>

# 3. Backfill and verify MongoDB.
npm run migrate:chat-to-mongo -- \
  --confirm-sql-db=<mysql-database> \
  --confirm-mongo-db=<mongo-database>

# 4. Restart in dual mode, verify shadow writes, then restart in mongo mode.
```

Before rollout, run the transaction smoke test against a disposable database
on an Atlas test cluster or another Mongo replica set. The command always uses
a random `jobsloot_e2e_chat_*` database and drops it in `finally`:

```bash
MONGODB_URI='<test-replica-set-uri>' npm run test:chat-mongo:isolated
```

The backfill is resumable and upsert-only. Legacy SQL message IDs are retained
as strings. Each conversation receives a stable numeric sequence ordered by
`createdAt` and then legacy SQL ID; `nextBefore` contains that sequence as a
string. `dual` keeps SQL authoritative while copying writes into Mongo and
sampling history reads for count/ID comparison. `mongo` writes no SQL
message/read rows; SQL remains in use for authorization, workflow, invitation
changes, and asynchronous in-app notifications. Keep the SQL chat tables for at least one coordinated
mobile release before considering a separate removal migration.

The canonical public backend origin is `https://jobsloot.com/`. Keep
`http://localhost:3000` only as the commented development reference in local
environment files. `APP_URL` controls URLs returned by the API; it does not
change the Nest listening port. Confirm the HTTPS reverse proxy forwards both
HTTP and WebSocket traffic before deployment.

### Registration lookup deployment

Country and language lookups are deployment data, not demo data. After running
the TypeORM migrations against a new environment, seed them idempotently with:

```bash
npm run seed:registration-lookups -- --dry-run --confirm-db=<database>
npm run seed:registration-lookups -- --confirm-db=<database>
```

The command requires `DB_SYNCHRONIZE=false`, verifies both lookup tables exist,
and upserts only the canonical registration countries and languages. It does
not delete lookup rows or modify users, jobs, applications, or demo data.

Verify the public registration dependencies after restarting the deployed
application:

```bash
curl -fsS 'https://jobsloot.com/countries?limit=100'
curl -fsS 'https://jobsloot.com/languages'
curl -fsS 'https://jobsloot.com/legal/current'
curl -fsS 'https://jobsloot.com/docs-json'
```

`GET /legal/current` must return HTTP 200 after the hardened build is deployed.
An empty `{ "data": [] }` response is valid while legal enforcement remains
disabled and before approved legal documents are published; a route-level 404
means the server is still running an older application build.

Proxy requirements:

- Forward HTTPS and WebSocket upgrades.
- Preserve `Authorization`.
- Route `/socket.io` with sticky sessions if the load balancer requires them.
- Allow only configured origins.
- Do not expose local `/uploads` in staging/production.

## Compatibility Window

Retained for one coordinated mobile release:

```text
access_token
login/register fcmToken
sessionless legacy JWTs until LEGACY_ACCESS_TOKEN_GRACE_UNTIL
numeric application IDs in chat resolvers
GET /chat/application/:id/messages
joinApplication
sendMessage
newMessage
```

New mobile work must use `accessToken`, refresh sessions, UUID conversation IDs,
plural `/chats` routes, and canonical `chat:*` events. Remove aliases only after
the coordinated mobile release is deployed and the configured grace date has
passed.

## Historical Verification Record

The following record predates the current hardening migrations and is retained
for deployment history. It is not evidence that this task modified staging:

```text
Build: passed
Unit tests: 17 suites / 88 tests passed
E2E tests: passed
OpenAPI: 132 paths, required new paths present
Startup: passed with DB_SYNCHRONIZE=false
Auth: login, protected reads, refresh rotation, logout passed
Socket: two authenticated clients joined a UUID room and received typing update
Migration: applied, second run reports no pending migration
```

Verified backfill totals:

```text
users: 16
companies: 3
applications: 24
conversations: 24
participants: 47
read states: 47
messages migrated: 30 / 30
ratings normalized: 24 / 24
applications without conversation: 0
messages without conversation: 0
invalid normalized ratings: 0
```

Deployment-only verification still required because local credentials/services
were not supplied:

```text
Two backend instances using the target Redis service
Signed upload/read/delete against the target S3-compatible bucket
Real Google and Facebook provider tokens
Real Twilio OTP delivery
Real FCM delivery and invalid-token removal
TLS proxy and configured production origins
```

The dependency audit currently reports transitive vulnerabilities. Review
`npm audit` output and schedule compatible dependency upgrades before production
release; do not use `npm audit fix --force` without regression testing.

## Mobile Integration Checklist

- Store `accessToken`, `refreshToken`, `sessionId`, and expiry securely.
- Keep `installationId` stable until app reinstall.
- Serialize refresh calls and retry the original request once after rotation.
- Clear auth state on refresh failure, reuse detection, ban, or logout-all.
- Handle `409 ACCOUNT_PENDING_DELETION` with the recovery flow.
- Handle social `202 AUTH_SOCIAL_PHONE_REQUIRED`.
- Use UUID `conversationId` everywhere.
- Generate stable `clientMessageId` and idempotency keys before the first send.
- Honor chat `readOnly` and block-related failures.
- Register/update/delete FCM devices by `installationId`.
- Do not cache signed asset URLs as permanent identifiers.
- Use `GET /posts?feed=mine` for recoverable publisher uploads.
- Keep legacy aliases only as temporary fallbacks.
