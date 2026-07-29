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
GET /chats/:conversationId/messages?before=<messageId>&limit=20
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
  id: number;
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
  lastReadMessageId: number | null;
  readAt: string;
}
```

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
invitation when the action is `invite`.

Respond to an invitation:

```http
PATCH /job-invitations/:invitationId
{ "action": "accept" | "decline" | "cancel" }
```

```ts
{
  invitation: { id: string; status: string; respondedAt: string };
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
  message: string;
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
STORAGE_PROVIDER=s3
S3_BUCKET S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY
S3_ENDPOINT and S3_FORCE_PATH_STYLE when required by the provider
TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_PHONE_NUMBER
FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_CLIENT_IDS or GOOGLE_CLIENT_ID when Google auth is enabled
FACEBOOK_APP_ID FACEBOOK_APP_SECRET when Facebook auth is enabled
```

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

## Verification Record

Completed locally against the populated `jobsloot_staging` database:

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
