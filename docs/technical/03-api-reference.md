# HiveCFM API Reference

This document provides a comprehensive reference for every HTTP API endpoint exposed by HiveCFM. All routes are implemented as Next.js App Router route handlers located under `apps/web/app/api/`.

---

## 1. API Overview

### Architecture

HiveCFM exposes a RESTful HTTP API organized into five distinct endpoint families:

| Family | Base Path | Purpose |
|--------|-----------|---------|
| **Client API** | `/api/v{1,2}/client/[environmentId]/...` | SDK and widget-facing endpoints (surveys, responses, displays) |
| **Management API** | `/api/v{1,2}/management/...` | Dashboard and programmatic administration (CRUD for surveys, responses, webhooks, tenants) |
| **Integration API** | `/api/v1/integrations/...` | Third-party service connectors (Slack, Notion, Airtable, Superset) |
| **Platform API** | `/api/v2/organizations/...`, `/api/v2/roles/...`, `/api/v2/me/...` | Organization, team, and user management |
| **System** | `/api/health`, `/api/ready`, `/api/oidc/...`, `/api/auth/...` | Health probes, authentication, OIDC provider |

### Versioning

Two API versions are active concurrently:

- **v1** -- Original API. All Client, Management, and Webhook endpoints.
- **v2** -- Newer API surface. Extends v1 with block-based survey structure, bulk operations, and organizational management. Many v2 client endpoints delegate to their v1 implementations internally.

Both versions share the same authentication and rate-limiting infrastructure.

### Content Types

- **Request body**: `application/json` for all endpoints except the OIDC token endpoint which also accepts `application/x-www-form-urlencoded`.
- **Response body**: `application/json`. All successful responses use `{ "data": ... }` envelope. Error responses use `{ "code": "...", "message": "...", "details": {...} }` envelope.
- **CORS**: Client API endpoints return full CORS headers (`Access-Control-Allow-Origin: *`). OPTIONS preflight responses are cached for 1 hour (`max-age=3600`).

### Base URLs

| Domain | Purpose |
|--------|---------|
| `WEBAPP_URL` (admin domain) | Management API, Integration API, dashboard UI, OIDC |
| `PUBLIC_URL` (public domain) | Client API, survey links, health probes |

When `PUBLIC_URL` is configured, middleware enforces domain-based route isolation: client-side routes are only accessible on the public domain, and admin routes only on the admin domain.

---

## 2. Authentication

HiveCFM supports three authentication methods. The method required depends on the API family being accessed.

### 2.1 No Authentication (Client API)

Client API endpoints under `/api/v{1,2}/client/[environmentId]/...` do **not** require authentication. The `environmentId` path parameter serves as the implicit scope. This design allows browser-based survey SDKs and embedded widgets to operate without exposing credentials.

```
GET /api/v1/client/cly1abc.../environment
```

No `Authorization` or `x-api-key` header is needed.

### 2.2 API Key Authentication (Management API)

Management API endpoints require an API key passed via the `x-api-key` HTTP header. API keys are scoped to an organization and carry per-environment permissions (`read`, `write`, `manage`).

```
GET /api/v1/management/surveys
x-api-key: hcfm_v2_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Key lookup flow:**

1. The system attempts to parse the key as a v2 key (prefix `hcfm_v2_`).
2. For v2 keys: a fast SHA-256 `lookupHash` index lookup is performed, followed by a bcrypt verification of the secret portion to prevent timing attacks.
3. For legacy keys: a direct SHA-256 hash comparison is used.
4. Permission checking enforces that the API key has the correct access level (`GET` = read, `POST` = write, `PUT` = write, `DELETE` = manage) for the target environment.

**Key format:**

| Format | Pattern | Notes |
|--------|---------|-------|
| v2 | `hcfm_v2_<secret>` | Recommended. Bcrypt-verified. |
| Legacy | Raw string | SHA-256 hash lookup. Deprecated. |

The `lastUsedAt` timestamp on the API key record is updated asynchronously (fire-and-forget, throttled to once per 30 seconds) to avoid adding latency to API calls.

### 2.3 Session Authentication (Integration API)

Integration endpoints under `/api/v1/integrations/...` require an active NextAuth session (cookie-based). These endpoints are accessed from the HiveCFM dashboard web UI and use server-side `getServerSession()` to verify the user.

```
GET /api/v1/integrations/slack
Cookie: next-auth.session-token=...
environmentId: clx1abc...
```

### 2.4 Combined Authentication (Storage)

The management storage endpoint (`/api/v1/management/storage`) accepts **either** an API key or a session, enabling both programmatic and UI-based file uploads.

### 2.5 Internal / Cron Authentication

Internal endpoints (`/api/(internal)/pipeline`, `/api/cron/campaigns`) authenticate using a shared `CRON_SECRET` passed via `x-api-key`. This is a server-to-server secret, not a user-facing API key.

### 2.6 OIDC Bearer Token

The OIDC userinfo endpoint (`/api/oidc/userinfo`) accepts a `Bearer` token in the `Authorization` header. This token is a JWT issued by the platform's OIDC provider.

```
GET /api/oidc/userinfo
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 3. Rate Limiting

### Algorithm

HiveCFM uses an **atomic Redis-based fixed-window rate limiter** implemented with a Lua script to prevent race conditions in multi-pod Kubernetes deployments.

**Source:** `apps/web/modules/core/rate-limit/rate-limit.ts`

The Lua script atomically increments a counter and sets a TTL on the first request in each window:

```lua
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, ttl)
end
return {current, current <= limit and 1 or 0}
```

**Key construction:** `rateLimit:{namespace}:{identifier}:{windowStart}`

The window start is calculated as `floor(now / (interval * 1000)) * interval`, creating fixed time buckets.

### Fail-Open Behavior

If Redis is unavailable or the rate limit check throws an error, the system **fails open** (allows the request). This ensures system availability takes priority over perfect rate limiting.

### Rate Limit Configurations

**Source:** `apps/web/modules/core/rate-limit/rate-limit-configs.ts`

| Category | Namespace | Limit | Window | Identifier |
|----------|-----------|-------|--------|------------|
| **Auth: Login** | `auth:login` | 10 requests | 15 minutes | IP address |
| **Auth: Signup** | `auth:signup` | 30 requests | 1 hour | IP address |
| **Auth: Forgot Password** | `auth:forgot` | 5 requests | 1 hour | IP address |
| **Auth: Verify Email** | `auth:verify` | 10 requests | 1 hour | IP address |
| **Management API (v1)** | `api:v1` | 100 requests | 1 minute | API key ID or user ID |
| **Management API (v2)** | `api:v2` | 100 requests | 1 minute | API key ID or user ID |
| **Client API** | `api:client` | 100 requests | 1 minute | IP address |
| **Sync + User ID** | `api:sync-user-identification` | 5 requests | 1 minute | `environmentId-userId` pair |
| **Storage: Upload** | `storage:upload` | 5 requests | 1 minute | IP address |
| **Storage: Delete** | `storage:delete` | 5 requests | 1 minute | IP address |
| **Action: Email Update** | `action:email` | 3 requests | 1 hour | User ID |
| **Action: Follow-up** | `action:followup` | 50 requests | 1 hour | User ID |
| **Action: Link Survey Email** | `action:send-link-survey-email` | 10 requests | 1 hour | User ID |

### Rate Limit Response

When a rate limit is exceeded, the API returns:

```json
{
  "code": "too_many_requests",
  "message": "Rate limit exceeded",
  "details": {}
}
```

**HTTP Status:** `429 Too Many Requests`

Rate limit violations are logged to the system logger and reported to Sentry as breadcrumbs.

---

## 4. Client API

Client API endpoints are called by the HiveCFM JavaScript SDK, mobile SDKs, embedded survey widgets, and IVR systems. They require no authentication; the `environmentId` path parameter scopes all operations.

### 4.1 Environment State

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/client/[environmentId]/environment` | Fetch environment configuration and active surveys |
| `OPTIONS` | `/api/v1/client/[environmentId]/environment` | CORS preflight |

**GET** returns the full environment state including active surveys, project settings, and styling configuration. The response is cached with:
- `Cache-Control: public, s-maxage=60, max-age=60, stale-while-revalidate=60, stale-if-error=60`
- An `expiresAt` field indicating when the SDK should re-poll (1 hour).

**Response:** `{ "data": { "data": {...}, "expiresAt": "ISO-8601" } }`

The v2 variant at `/api/v2/client/[environmentId]/environment` delegates to the same implementation.

### 4.2 App Sync (Deprecated)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/client/[environmentId]/app/sync/[userId]` | Sync surveys, action classes, and contact state for a user |
| `OPTIONS` | `/api/v1/client/[environmentId]/app/sync/[userId]` | CORS preflight |

**Deprecated.** Currently used only by older React Native SDKs. Newer SDKs should use the environment state and identify endpoints instead.

This endpoint creates a contact record if one does not exist for the given `userId`, fetches surveys targeted to the user, and returns action classes. Rate limited to 5 requests per minute per environment-user pair.

**Response:**
```json
{
  "data": {
    "surveys": [...],
    "actionClasses": [...],
    "language": "en",
    "project": {...}
  }
}
```

### 4.3 Contact Identification

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v{1,2}/client/[environmentId]/identify/contacts/[userId]` | Identify or create a contact by userId |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/identify/contacts/[userId]` | CORS preflight |

Resolves a contact by `userId` within the environment. Creates the contact if it does not exist. Requires an enterprise license with contacts feature enabled.

### 4.4 Contact Attributes

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/api/v{1,2}/client/[environmentId]/contacts/[userId]/attributes` | Update attributes for a contact |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/contacts/[userId]/attributes` | CORS preflight |

Updates custom attributes on a contact identified by `userId`. Requires contacts feature to be enabled.

**Request body:**
```json
{
  "attributes": {
    "plan": "enterprise",
    "company": "Acme Corp"
  }
}
```

### 4.5 User (Legacy Contact Creation)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v{1,2}/client/[environmentId]/user` | Create or identify a user/contact |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/user` | CORS preflight |

Legacy endpoint for contact creation. Delegates to the enterprise contacts module.

### 4.6 Displays

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/client/[environmentId]/displays` | Record a survey display event |
| `OPTIONS` | `/api/v1/client/[environmentId]/displays` | CORS preflight |

Records that a survey was displayed to a user. Used by the SDK to track survey impressions and prevent re-showing surveys that have display limits.

**Request body (v1):**
```json
{
  "surveyId": "clx...",
  "userId": "optional-user-id"
}
```

The v2 variant at `/api/v2/client/[environmentId]/displays` uses `ZDisplayCreateInputV2` which accepts `contactId` instead of `userId`.

### 4.7 Response Submission

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v{1,2}/client/[environmentId]/responses` | Create a new survey response |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/responses` | CORS preflight |

Creates a new response for a survey. The system automatically captures:
- User agent (browser, device, OS) via `ua-parser-js`
- Country from CDN headers (`CF-IPCountry`, `X-Vercel-IP-Country`, `CloudFront-Viewer-Country`)
- IP address (if `isCaptureIpEnabled` is set on the survey)

**Pre-flight checks:**
1. License validity
2. Completed response quota
3. File upload validation
4. Survey existence and environment ownership

**Request body (v1):**
```json
{
  "surveyId": "clx...",
  "finished": false,
  "data": {
    "questionId1": "answer value",
    "questionId2": 5
  },
  "meta": {
    "source": "link",
    "url": "https://..."
  },
  "language": "en",
  "userId": "optional"
}
```

**v2 differences:** Uses `contactId` instead of `userId`. Uses `ZResponseInputV2` schema.

**Response:**
```json
{
  "data": {
    "id": "response-id",
    "quotaFull": false
  }
}
```

When a response is created, `responseCreated` is sent to the pipeline. If `finished: true`, `responseFinished` is also dispatched.

### 4.8 Response Update

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/api/v{1,2}/client/[environmentId]/responses/[responseId]` | Update an existing survey response |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/responses/[responseId]` | CORS preflight |

Updates an in-progress response with additional answers. Rejects updates to responses already marked as `finished`.

**Validations:**
- "Other" option text length for multiple-choice questions
- File upload data integrity
- Response existence and not-finished state

Pipeline events: `responseUpdated` is always sent. If the update sets `finished: true`, `responseFinished` is also dispatched.

### 4.9 File Upload (Private)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v{1,2}/client/[environmentId]/storage` | Get a signed URL for uploading a private file |
| `OPTIONS` | `/api/v{1,2}/client/[environmentId]/storage` | CORS preflight |

Returns a pre-signed S3 URL for uploading a file associated with a survey response (e.g., a file upload question). Files are stored as **private** (only accessible to environment members).

**Custom rate limit:** 5 uploads per minute per IP (`storage:upload`).

**Request body:**
```json
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "surveyId": "clx..."
}
```

**Response:**
```json
{
  "data": {
    "signedUrl": "https://s3...",
    "fileUrl": "https://..."
  }
}
```

File size limits depend on the organization's billing plan (standard vs. enterprise).

### 4.10 IVR / Voice Survey Endpoints

These endpoints support Interactive Voice Response (IVR) systems for telephony-based surveys.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/client/[environmentId]/ivr/[surveyId]` | Get linearized IVR survey structure |
| `OPTIONS` | `/api/v1/client/[environmentId]/ivr/[surveyId]` | CORS preflight |
| `POST` | `/api/v1/client/[environmentId]/ivr/[surveyId]/responses` | Submit an IVR survey response |
| `OPTIONS` | `/api/v1/client/[environmentId]/ivr/[surveyId]/responses` | CORS preflight |
| `GET` | `/api/v1/client/[environmentId]/ivr/[surveyId]/media/[questionId]` | Stream audio prompt for a question |
| `OPTIONS` | `/api/v1/client/[environmentId]/ivr/[surveyId]/media/[questionId]` | CORS preflight |

#### GET .../ivr/[surveyId]

Returns a linearized representation of the survey optimized for IVR flows. Hidden field values can be passed as query parameters and will be included in the output. The response includes question prompts, DTMF key mappings, and media URLs.

**Query parameters:** Any query parameter not named `environmentId` or `surveyId` is treated as a hidden field value.

#### POST .../ivr/[surveyId]/responses

Creates a response from an IVR call.

**Request body:**
```json
{
  "callId": "unique-call-identifier",
  "callerNumber": "+1234567890",
  "answers": {
    "questionId1": 4,
    "questionId2": "yes"
  },
  "finished": true,
  "language": "en",
  "hiddenFields": {
    "agentId": "A123"
  },
  "meta": {
    "source": "ivr",
    "callDuration": 120
  }
}
```

The `callId` maps to `singleUseId` internally, preventing duplicate responses from the same call.

#### GET .../ivr/[surveyId]/media/[questionId]

Proxies the audio file for a question's `audioUrl`. If the audio is stored in HiveCFM's S3 storage, it generates a signed download URL and streams the content with proper `Content-Type` headers. External URLs receive a `302` redirect.

Audio is cached for 1 hour: `Cache-Control: public, max-age=3600`.

---

## 5. Management API

Management API endpoints provide full CRUD access to HiveCFM resources. All endpoints require API key authentication via the `x-api-key` header unless otherwise noted.

### 5.1 Current User / API Key Info

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/me` | API Key or Session | Return info about the authenticated entity |
| `GET` | `/api/v2/me` | Module-delegated | Return current user info |

**With API key:** Returns the first environment associated with the key, including project details.

**With session:** Returns the full user record.

### 5.2 Survey Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/surveys` | API Key | List all surveys across permitted environments |
| `POST` | `/api/v1/management/surveys` | API Key | Create a new survey |
| `GET` | `/api/v1/management/surveys/[surveyId]` | API Key | Get a single survey by ID |
| `PUT` | `/api/v1/management/surveys/[surveyId]` | API Key | Update a survey |
| `DELETE` | `/api/v1/management/surveys/[surveyId]` | API Key | Delete a survey |
| `GET` | `/api/v1/management/surveys/[surveyId]/singleUseIds` | API Key | Generate single-use survey links |

#### GET /surveys

**Query parameters:**
- `limit` (number, optional) -- Maximum number of surveys to return
- `offset` (number, optional) -- Number of surveys to skip

Returns surveys with backward-compatible `questions` array transformation when blocks contain single elements.

#### POST /surveys

Creates a survey. Input is validated against `ZSurveyCreateInputWithEnvironmentId`. The body must include `environmentId` to specify which environment the survey belongs to.

If the input uses the legacy `questions` array format, it is automatically transformed to the `blocks` structure internally.

**Feature permission checks** are performed for features like multi-language, follow-ups, and recall fields based on the organization's plan.

**Audit:** Action `created`, target type `survey`.

#### GET /surveys/[surveyId]

Returns a single survey. Supports hidden field resolution via query parameters -- any query parameter not named `surveyId` is treated as a hidden field value. If hidden fields are provided:
1. A `surveyLink` URL is generated with the values embedded as query parameters.
2. Recall tags (`#recall:fieldId/fallback:value#`) in survey text are resolved using the provided values.

#### PUT /surveys/[surveyId]

Partial update of a survey. Merged with the existing survey data before validation against `ZSurveyUpdateInput`.

**Audit:** Action `updated`, target type `survey`.

#### DELETE /surveys/[surveyId]

Soft-deletes a survey.

**Audit:** Action `deleted`, target type `survey`.

#### GET /surveys/[surveyId]/singleUseIds

Generates unique single-use survey links for link-type surveys with single-use mode enabled.

**Query parameters:**
- `limit` (number, optional, default: 10, max: 5000) -- Number of unique links to generate

**Response:** Array of full survey URLs with `?suId=...` query parameter.

### 5.3 Response Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/responses` | API Key | List responses, optionally filtered by survey |
| `POST` | `/api/v1/management/responses` | API Key | Create a response programmatically |
| `GET` | `/api/v1/management/responses/[responseId]` | API Key | Get a single response |
| `PUT` | `/api/v1/management/responses/[responseId]` | API Key | Update a response |
| `DELETE` | `/api/v1/management/responses/[responseId]` | API Key | Delete a response |
| `GET` | `/api/v2/management/responses` | Module-delegated | List responses (v2) |
| `POST` | `/api/v2/management/responses` | Module-delegated | Create a response (v2) |
| `GET` | `/api/v2/management/responses/[responseId]` | Module-delegated | Get a response (v2) |
| `PUT` | `/api/v2/management/responses/[responseId]` | Module-delegated | Update a response (v2) |
| `DELETE` | `/api/v2/management/responses/[responseId]` | Module-delegated | Delete a response (v2) |

#### GET /responses

**Query parameters:**
- `surveyId` (string, optional) -- Filter responses by survey
- `limit` (number, optional) -- Maximum results
- `skip` (number, optional) -- Offset for pagination

If `surveyId` is provided, returns responses for that survey (with environment permission check). Otherwise, returns all responses across all environments the API key has access to.

#### POST /responses

Programmatic response creation. Supports `createdAt` and `updatedAt` override for importing historical data (if `createdAt` is provided without `updatedAt`, `updatedAt` is set to match).

Pre-flight checks: license validity, completed response quota, file upload validation.

**Audit:** Action `created`, target type `response`.

#### PUT /responses/[responseId]

Updates response data. Triggers `responseUpdated` and optionally `responseFinished` pipeline events.

**Audit:** Action `updated`, target type `response`.

#### DELETE /responses/[responseId]

Permanently deletes a response.

**Audit:** Action `deleted`, target type `response`.

### 5.4 Webhook Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/webhooks` | API Key | List all webhooks |
| `POST` | `/api/v1/webhooks` | API Key | Create a webhook |
| `GET` | `/api/v1/webhooks/[webhookId]` | API Key | Get a webhook |
| `DELETE` | `/api/v1/webhooks/[webhookId]` | API Key | Delete a webhook |
| `GET` | `/api/v2/management/webhooks` | Module-delegated | List webhooks (v2) |
| `POST` | `/api/v2/management/webhooks` | Module-delegated | Create a webhook (v2) |
| `GET` | `/api/v2/management/webhooks/[webhookId]` | Module-delegated | Get a webhook (v2) |
| `PUT` | `/api/v2/management/webhooks/[webhookId]` | Module-delegated | Update a webhook (v2) |
| `DELETE` | `/api/v2/management/webhooks/[webhookId]` | Module-delegated | Delete a webhook (v2) |

#### POST /webhooks

**Request body:**
```json
{
  "url": "https://example.com/webhook",
  "triggers": ["responseFinished", "responseCreated"],
  "environmentId": "clx...",
  "surveyIds": ["survey1", "survey2"],
  "name": "My Webhook",
  "source": "api"
}
```

**Trigger values:** `responseCreated`, `responseUpdated`, `responseFinished` (from Prisma `PipelineTriggers` enum).

If `surveyIds` is empty, the webhook fires for all surveys in the environment.

**Audit:** Action `created`, target type `webhook`.

### 5.5 Contact Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/contacts` | API Key | List contacts |
| `GET` | `/api/v1/management/contacts/[contactId]` | API Key | Get a contact |
| `DELETE` | `/api/v1/management/contacts/[contactId]` | API Key | Delete a contact |
| `POST` | `/api/v2/management/contacts` | Module-delegated | Create a contact (v2) |
| `PUT` | `/api/v2/management/contacts/bulk` | Module-delegated | Bulk upsert contacts (v2) |

Contact endpoints delegate to the enterprise contacts module (`@/modules/ee/contacts/`). Creating contacts via the management API is only supported in v2; v1 contacts are created via the client API.

### 5.6 Contact Attribute Keys

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/contact-attribute-keys` | API Key | List attribute key definitions |
| `POST` | `/api/v1/management/contact-attribute-keys` | API Key | Create an attribute key |
| `GET` | `/api/v1/management/contact-attribute-keys/[id]` | API Key | Get an attribute key |
| `PUT` | `/api/v1/management/contact-attribute-keys/[id]` | API Key | Update an attribute key |
| `DELETE` | `/api/v1/management/contact-attribute-keys/[id]` | API Key | Delete an attribute key |
| `GET` | `/api/v2/management/contact-attribute-keys` | Module-delegated | List attribute keys (v2) |
| `POST` | `/api/v2/management/contact-attribute-keys` | Module-delegated | Create attribute key (v2) |
| `GET` | `/api/v2/management/contact-attribute-keys/[id]` | Module-delegated | Get attribute key (v2) |
| `PUT` | `/api/v2/management/contact-attribute-keys/[id]` | Module-delegated | Update attribute key (v2) |
| `DELETE` | `/api/v2/management/contact-attribute-keys/[id]` | Module-delegated | Delete attribute key (v2) |

### 5.7 Contact Attributes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/contact-attributes` | API Key | List contact attribute values |

Returns the actual attribute values across contacts (not the key definitions).

### 5.8 Action Classes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/action-classes` | API Key | List all action classes |
| `POST` | `/api/v1/management/action-classes` | API Key | Create an action class |
| `GET` | `/api/v1/management/action-classes/[id]` | API Key | Get an action class |
| `PUT` | `/api/v1/management/action-classes/[id]` | API Key | Update an action class |
| `DELETE` | `/api/v1/management/action-classes/[id]` | API Key | Delete an action class |

Action classes define triggering events for app-type surveys (e.g., page view, button click, code-triggered actions).

**POST /action-classes request body:**
```json
{
  "environmentId": "clx...",
  "name": "Button Clicked",
  "type": "code",
  "description": "Fires when user clicks the CTA button"
}
```

**Audit:** Actions `created`, `updated`, `deleted`, target type `actionClass`.

### 5.9 Channel Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/channels` | API Key | List all channels across environments |
| `POST` | `/api/v1/management/channels` | API Key | Create a channel |
| `GET` | `/api/v1/management/channels/[channelId]` | API Key | Get a channel |
| `PUT` | `/api/v1/management/channels/[channelId]` | API Key | Update a channel |
| `DELETE` | `/api/v1/management/channels/[channelId]` | API Key | Delete a channel |

Channels represent communication pathways (e.g., SMS, email, chat) and are scoped to environments.

**POST /channels request body:**
```json
{
  "environmentId": "clx...",
  "name": "SMS Channel",
  "type": "sms",
  "config": {...}
}
```

**Audit:** Actions `created`, `updated`, `deleted`, target type `channel`.

### 5.10 File Upload (Public)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/management/storage` | API Key or Session | Get a signed URL for uploading a public file |

Used for uploading public assets like survey background images or logos. Files are publicly accessible (no authentication required to view).

**Custom rate limit:** 5 uploads per minute (`storage:upload`).

**Max file size:** 5 MB for public files.

**Request body:**
```json
{
  "fileName": "background.jpg",
  "fileType": "image/jpeg",
  "environmentId": "clx..."
}
```

### 5.11 Survey Contact Links (v2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/management/surveys/[surveyId]/contact-links/contacts/[contactId]` | Module-delegated | Get contact link for a survey |
| `GET` | `/api/v2/management/surveys/[surveyId]/contact-links/segments/[segmentId]` | Module-delegated | Get segment link for a survey |

These v2 endpoints manage personalized survey links for specific contacts or contact segments.

### 5.12 License Management

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/management/license/activate` | API Key | Activate a license by key |
| `POST` | `/api/v1/management/license/activate-offline` | API Key | Activate a license using an offline token |

#### POST /license/activate

Validates a license key and returns the license details along with a `valid` boolean.

**Request body:**
```json
{
  "licenseKey": "HCFM-XXXX-XXXX-XXXX"
}
```

**Audit:** Action `accessed`, target type `tenantLicense`.

#### POST /license/activate-offline

Activates a license using a cryptographically signed JWT token for air-gapped environments. The token is verified using the `@hivecfm/license-crypto` package.

**Request body:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Audit:** Action `created`, target type `tenantLicense`.

---

## 6. Tenant Management API

These endpoints manage multi-tenant operations including provisioning, deactivation, licensing, branding, quotas, credentials, and workflow automation. All require API key authentication.

### 6.1 Tenant CRUD

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants` | API Key | List all tenants |
| `POST` | `/api/v1/management/tenants` | API Key | Provision a new tenant |
| `GET` | `/api/v1/management/tenants/[orgId]` | API Key | Get tenant details |
| `PATCH` | `/api/v1/management/tenants/[orgId]` | API Key | Update tenant name |
| `DELETE` | `/api/v1/management/tenants/[orgId]` | API Key | Deactivate a tenant |

#### POST /tenants (Provisioning)

Full tenant provisioning pipeline:
1. Creates organization, project, and environments in the database
2. Creates a license (if provided in input)
3. Runs external service provisioning:
   - **Superset:** Creates RLS (Row-Level Security) rules for analytics isolation
   - **n8n:** Creates tenant credentials and deploys default workflow templates
   - **HiveCFM Notifications:** Provisions notification infrastructure
   - **HiveCFM Hub:** Registers the tenant

If external provisioning partially fails, the tenant is still created with a `provisioningWarning` in the response.

**Audit:** Action `created`, target type `tenant`.

#### DELETE /tenants/[orgId]

Performs a soft deactivation (not a hard delete). External service deprovisioning is handled by the `TenantProvisioner` class.

**Audit:** Action `deleted`, target type `tenant`.

### 6.2 Tenant Branding

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants/[orgId]/branding` | API Key | Get tenant branding |
| `PATCH` | `/api/v1/management/tenants/[orgId]/branding` | API Key | Update tenant branding |

Manages organization-specific branding (logos, colors, custom CSS).

**Audit:** Action `updated`, target type `tenantBranding`.

### 6.3 Tenant Credentials (n8n)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants/[orgId]/credentials` | API Key | Get n8n credential status |
| `POST` | `/api/v1/management/tenants/[orgId]/credentials` | API Key | Rotate n8n credentials |

The GET endpoint checks whether the tenant has active n8n workflow credentials. The POST endpoint rotates (regenerates) the credentials.

**Audit:** Action `updated`, target type `apiKey`.

### 6.4 Tenant License

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants/[orgId]/license` | API Key | Get license status |
| `POST` | `/api/v1/management/tenants/[orgId]/license` | API Key | Create a license for a tenant |
| `PATCH` | `/api/v1/management/tenants/[orgId]/license` | API Key | Update a license |

**Audit:** Actions `created` and `updated`, target type `tenantLicense`.

### 6.5 Tenant Quotas

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants/[orgId]/quotas` | API Key | Get quota configuration and current usage |
| `PATCH` | `/api/v1/management/tenants/[orgId]/quotas` | API Key | Update quota limits |

The GET response includes both the configured quota limits and the current usage metrics.

**Audit:** Action `updated`, target type `tenantQuota`.

### 6.6 Tenant Workflows (n8n)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/tenants/[orgId]/workflows` | API Key | List available workflow templates |
| `POST` | `/api/v1/management/tenants/[orgId]/workflows` | API Key | Deploy a workflow template for a tenant |
| `DELETE` | `/api/v1/management/tenants/[orgId]/workflows/[workflowId]` | API Key | Remove a deployed workflow |

#### POST /workflows

Deploys an n8n workflow template for the specified tenant.

**Request body:**
```json
{
  "templateId": "template-uuid"
}
```

**Audit:** Action `created`, target type `workflow`.

---

## 7. Integration API

Integration endpoints facilitate OAuth flows and data exchange with external services. They require session authentication (dashboard login).

### 7.1 Analytics

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/integrations/analytics/superset-token` | Session | Mint a Superset guest token (user context) |
| `GET` | `/api/v1/integrations/analytics/dashboards` | Session | List available dashboard templates |
| `GET` | `/api/v1/management/analytics/superset-token` | API Key | Mint a Superset guest token (API key context) |

**GET /superset-token**

Both endpoints mint a Superset guest token scoped to the organization. The integration variant uses session authentication and requires an `environmentId` header; the management variant uses API key authentication and derives the org from the key.

**Query parameters:**
- `dashboard` (string, optional, default: `"csat-overview"`) -- Dashboard name to scope the token to.

### 7.2 Slack

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/integrations/slack` | Session | Get Slack OAuth authorization URL |
| `GET` | `/api/v1/integrations/slack/callback` | Session | Handle Slack OAuth callback |

Initiates the Slack OAuth flow. The `environmentId` header is passed as OAuth `state` parameter.

### 7.3 Notion

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/integrations/notion` | Session | Get Notion OAuth authorization URL |
| `GET` | `/api/v1/integrations/notion/callback` | Session | Handle Notion OAuth callback |

### 7.4 Airtable

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/integrations/airtable` | Session | Get Airtable OAuth authorization URL (with PKCE) |
| `GET` | `/api/v1/integrations/airtable/callback` | Session | Handle Airtable OAuth callback |
| `GET` | `/api/v1/integrations/airtable/tables` | Session | List Airtable tables for connected base |

The Airtable integration uses PKCE (Proof Key for Code Exchange) with S256 code challenge method.

### 7.5 Google Sheets

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/google-sheet` | Session | Get Google Sheets OAuth authorization URL |
| `GET` | `/api/google-sheet/callback` | Session | Handle Google Sheets OAuth callback |

### 7.6 Genesys Bot Connector

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/management/bot-connector/bots` | API Key | List available bots for Genesys |
| `POST` | `/api/v1/management/bot-connector/turn` | API Key | Process a conversational turn |

#### GET /bot-connector/bots

Returns a static list of available bots. Genesys calls this endpoint to populate the Bot Name dropdown in its integration configuration.

**Response:**
```json
{
  "bots": [
    {
      "id": "hivecfm-survey-bot",
      "name": "HiveCFM Survey Bot",
      "description": "Post-conversation customer feedback survey",
      "versions": [
        {
          "version": "1.0",
          "intents": [
            { "name": "survey_in_progress", "description": "Survey is in progress" },
            { "name": "survey_complete", "description": "Survey completed successfully" },
            { "name": "survey_opted_out", "description": "Customer opted out of survey" },
            { "name": "survey_error", "description": "Error occurred during survey" }
          ]
        }
      ]
    }
  ]
}
```

#### POST /bot-connector/turn

Implements the Genesys Bot Connector v1 turn-based protocol. Each POST represents one conversational turn.

**Session management:** Server-side in-memory session store keyed by `botSessionId` with a 1-hour TTL and periodic cleanup every 10 minutes.

**First turn:**
- Expects `parameters.surveyId` and `parameters.environmentId` in the request body.
- Fetches the survey and filters questions to chat-compatible types.
- Creates a HiveCFM response record (`finished: false`).
- Returns the first question as a `replymessages` array with `botState: "MoreData"`.

**Subsequent turns:**
- Extracts the user's answer from `inputMessage.text` or `inputMessage.content[].buttonResponse`.
- Checks for opt-out keywords (`stop`, `quit`, `cancel`, etc.).
- Saves partial answers to HiveCFM.
- Returns the next question or completes the survey.

**Completion:**
- Marks the response as `finished: true`.
- Sends `responseUpdated` and `responseFinished` pipeline events.
- Returns `botState: "Complete"` with the survey's thank-you message (HTML tags stripped).

**Intent cycling:** To avoid Genesys's "unchanged intent" safety limit (4 consecutive same intents triggers failure), each turn appends `_q{index}` to the intent name.

**Audit:** Action `created`, target type `response`.

### 7.7 HiveCFM Notification Service SMS Inbound

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/notifications/sms-inbound` | None | Receive inbound SMS messages from the HiveCFM notification service |

Webhook endpoint for processing incoming SMS survey replies. Looks up an active SMS survey session by phone number, parses the answer, and advances the survey conversation.

The endpoint accepts multiple HiveCFM notification service payload formats and gracefully handles missing phone or message fields.

**Session management:** Uses Redis-backed SMS sessions (via `getSmsSession`/`setSmsSession`/`deleteSmsSession`).

---

## 8. Platform API (v2)

These v2 endpoints manage organizational structure, teams, and users.

### 8.1 Organizations

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/organizations/[orgId]/users` | Module-delegated | List users in an organization |
| `POST` | `/api/v2/organizations/[orgId]/users` | Module-delegated | Invite a user to an organization |
| `PATCH` | `/api/v2/organizations/[orgId]/users` | Module-delegated | Update a user's role |

### 8.2 Teams

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/organizations/[orgId]/teams` | Module-delegated | List teams |
| `POST` | `/api/v2/organizations/[orgId]/teams` | Module-delegated | Create a team |
| `GET` | `/api/v2/organizations/[orgId]/teams/[teamId]` | Module-delegated | Get a team |
| `PUT` | `/api/v2/organizations/[orgId]/teams/[teamId]` | Module-delegated | Update a team |
| `DELETE` | `/api/v2/organizations/[orgId]/teams/[teamId]` | Module-delegated | Delete a team |

### 8.3 Project Teams

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/organizations/[orgId]/project-teams` | Module-delegated | List project-team assignments |
| `POST` | `/api/v2/organizations/[orgId]/project-teams` | Module-delegated | Assign a team to a project |
| `PUT` | `/api/v2/organizations/[orgId]/project-teams` | Module-delegated | Update project-team assignment |
| `DELETE` | `/api/v2/organizations/[orgId]/project-teams` | Module-delegated | Remove project-team assignment |

### 8.4 Roles

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/roles` | Module-delegated | List available roles |

### 8.5 Health (v2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v2/health` | None | Health check (v2) |

---

## 9. System Endpoints

### 9.1 Health Check

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/health` | None | Comprehensive health status |

Returns health status of database and cache systems.

**Response (healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": true,
      "cache": true
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**HTTP 200** when all systems are healthy, **HTTP 503** when any system is unhealthy.

### 9.2 Readiness Probe

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/ready` | None | Kubernetes readiness probe |

Designed for Kubernetes/container orchestration load balancer health checks.

**Response (ready):** `{ "ready": true }` with HTTP 200.

**Response (not ready):** `{ "ready": false, "reason": "database unavailable" }` with HTTP 503.

### 9.3 OIDC Provider

HiveCFM acts as an OpenID Connect provider for downstream services (e.g., Superset, Grafana).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/oidc/.well-known/openid-configuration` | None | OIDC discovery document |
| `GET` | `/api/oidc/authorize` | Session | Authorization endpoint |
| `POST` | `/api/oidc/token` | Client credentials | Token exchange |
| `GET` | `/api/oidc/jwks` | None | JSON Web Key Set |
| `GET` | `/api/oidc/userinfo` | Bearer token | User info endpoint |

#### GET /oidc/authorize

Implements the Authorization Code flow. Requires:
- `client_id` -- Registered OIDC client
- `redirect_uri` -- Must match registered URIs
- `response_type` -- Must be `code`
- `state` -- Passed through to callback

If the user has no active session, they are redirected to the login page with a return URL. Only users with `admin` or `owner` roles can authorize.

#### POST /oidc/token

Exchanges an authorization code for tokens. Accepts both `application/json` and `application/x-www-form-urlencoded`.

**Request parameters:**
- `grant_type` -- Must be `authorization_code`
- `code` -- Authorization code from the authorize step
- `redirect_uri` -- Must match the original request
- `client_id` / `client_secret` -- Client credentials

**Response:**
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "..."
}
```

Currently uses HS256 (HMAC-SHA256) symmetric signing. The JWKS endpoint returns an empty keys array pending migration to asymmetric signing.

### 9.4 SAML Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/auth/saml/authorize` | None | Initiate SAML SSO flow |
| `POST` | `/api/auth/saml/callback` | None | Handle SAML assertion callback |
| `POST` | `/api/auth/saml/token` | None | Exchange SAML assertion for token |
| `GET` | `/api/auth/saml/userinfo` | None | Get user info from SAML session |

SAML endpoints are delegated to the enterprise auth module (`@/modules/ee/auth/saml/`).

### 9.5 NextAuth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `*` | `/api/auth/[...nextauth]` | Varies | NextAuth.js catch-all handler |

Handles all NextAuth authentication flows including login, logout, session management, and OAuth provider callbacks.

### 9.6 Internal Pipeline

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/(internal)/pipeline` | CRON_SECRET | Process response events |

Internal endpoint called after response creation/completion to trigger:
1. Webhook delivery to all matching webhooks
2. Email notifications to users with alert subscriptions
3. Integration data syncing (Airtable, Notion, Slack, Google Sheets)
4. Response push to HiveCFM Hub
5. Follow-up email sending
6. Auto-complete survey check
7. Telemetry event dispatch

### 9.7 Cron: Campaigns

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/cron/campaigns` | CRON_SECRET | Process scheduled campaign sends |

Called by a cron job scheduler. Processes campaigns that are scheduled to send (SMS, email).

### 9.8 Billing

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/billing/stripe-webhook` | Stripe signature | Handle Stripe webhook events |

Delegated to the enterprise billing module.

---

## 10. Webhook Events

When survey responses are created, updated, or completed, HiveCFM delivers webhook payloads to all matching webhook URLs configured for the environment.

### Event Types

| Event | Trigger |
|-------|---------|
| `responseCreated` | A new response is submitted (even if partial) |
| `responseUpdated` | An existing response is updated with new answers |
| `responseFinished` | A response is marked as finished/complete |

### Webhook Matching

A webhook fires if:
1. It is configured for the event's environment
2. Its `triggers` array includes the event type
3. Either its `surveyIds` array includes the survey, OR the array is empty (fires for all surveys)

### Payload Format

```json
{
  "webhookId": "webhook-uuid",
  "event": "responseFinished",
  "data": {
    "id": "response-id",
    "surveyId": "survey-id",
    "finished": true,
    "data": {
      "questionId1": "answer",
      "questionId2": 5
    },
    "meta": {
      "source": "link",
      "userAgent": {...}
    },
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "survey": {
      "title": "Customer Satisfaction Survey",
      "type": "link",
      "status": "inProgress",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  }
}
```

### Delivery Headers

All webhook deliveries include Standard Webhooks headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `webhook-id` | Unique message ID (UUIDv7) |
| `webhook-timestamp` | Unix timestamp (seconds) |
| `webhook-signature` | HMAC signature (only if webhook has a `secret` configured) |

### Signature Verification

When a webhook has a `secret`, the `webhook-signature` header contains an HMAC-based signature computed as:

```
signature = base64(hmac_sha256(secret, "{webhook-id}.{webhook-timestamp}.{body}"))
```

The signature follows the Standard Webhooks specification. Consumers should verify the signature and reject payloads with timestamps older than 5 minutes to prevent replay attacks.

### Delivery Behavior

- Each webhook call has a **5-second timeout**.
- Deliveries are fire-and-forget; failures are logged but do not retry.
- All webhook and email promises are settled using `Promise.allSettled` to prevent one failure from blocking others.

---

## 11. Error Handling

### Standard Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "code": "error_code",
  "message": "Human-readable error description",
  "details": {
    "field_name": "Specific error detail"
  }
}
```

### Error Codes and HTTP Status Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| `400` | `bad_request` | Invalid input, missing fields, or malformed JSON |
| `401` | `not_authenticated` | Missing or invalid API key / session |
| `401` | `unauthorized` | Valid credentials but insufficient permissions |
| `403` | `forbidden` | Action blocked by license, quota, or feature gate |
| `404` | `not_found` | Requested resource does not exist |
| `405` | `method_not_allowed` | HTTP method not supported for this route |
| `410` | `gone` | Resource has been permanently removed |
| `429` | `too_many_requests` | Rate limit exceeded |
| `500` | `internal_server_error` | Unexpected server error |

### Validation Errors

When Zod schema validation fails, the `details` object contains field-level errors:

```json
{
  "code": "bad_request",
  "message": "Fields are missing or incorrectly formatted",
  "details": {
    "surveyId": "Required",
    "data.questionId1": "Expected string, received number"
  }
}
```

### Not Found Response

Resource-specific not found responses include the resource type and ID:

```json
{
  "code": "not_found",
  "message": "Survey not found",
  "details": {
    "resource_id": "clx123...",
    "resource_type": "Survey"
  }
}
```

### Error Logging

Non-success responses (status >= 400) are automatically logged via the API wrapper:
1. **System logger** (`@hivecfm/logger`): All errors with correlation ID, method, path, and status
2. **Sentry**: 5xx errors in production are reported to Sentry with full context

The `x-request-id` header is used as a correlation ID for tracing errors across systems.

### Cache Headers

All error responses include `Cache-Control: private, no-store` to prevent caching of error states.

---

## 12. API Logging & Middleware

### withV1ApiWrapper

**Source:** `apps/web/app/lib/api/with-api-logging.ts`

The `withV1ApiWrapper` function is the primary middleware wrapper for v1 API handlers. It provides a unified pipeline:

```
Request → Route Classification → Authentication → Audit Log Setup → Rate Limiting → Handler Execution → Response Processing → Response
```

#### Pipeline stages

1. **Route Classification** (`getRouteType`): Determines if the route is Client, General (Management), or Integration. This controls which authentication method and rate limit config are applied.

2. **Authentication** (`handleAuthentication`):
   - Client routes: No authentication (`AuthenticationMethod.None`)
   - Management routes: API key (`AuthenticationMethod.ApiKey`), except storage which accepts both
   - Integration routes: Session (`AuthenticationMethod.Session`)
   - Webhook routes: API key (`AuthenticationMethod.ApiKey`)

3. **Audit Log Setup**: If the handler specifies `action` and `targetType`, an audit log object is created and enriched with the authenticated user's identity.

4. **Rate Limiting**: Applied based on route type and authentication:
   - Authenticated routes: Rate limited by API key ID or user ID
   - Client routes: Rate limited by IP address
   - Sync endpoints: Additional rate limiting by environment-user pair

5. **Handler Execution**: The handler function receives `{ req, props, auditLog, authentication }`.

6. **Response Processing**:
   - Successful responses: Audit log marked as `"success"`
   - Failed responses: Logged to system logger and Sentry (for 5xx in production)
   - Audit events: Queued asynchronously if `AUDIT_LOG_ENABLED` is true

#### Audit Log Events

When configured, the wrapper automatically:
- Sets `userId` and `organizationId` from the authentication context
- Captures `oldObject` (before) and `newObject` (after) states
- Records the API URL and action type
- Marks status as `"success"` or `"failure"`
- Queues the event via `queueAuditEvent()`

Supported audit actions: `created`, `updated`, `deleted`, `accessed`

Supported audit target types: `survey`, `response`, `webhook`, `actionClass`, `channel`, `tenant`, `tenantBranding`, `tenantLicense`, `tenantQuota`, `workflow`, `apiKey`

---

## 13. Complete Endpoint Index

The following table lists every route file and the HTTP methods it exports.

### System & Auth Endpoints

| # | Path | Methods | Auth |
|---|------|---------|------|
| 1 | `/api/health` | GET | None |
| 2 | `/api/ready` | GET | None |
| 3 | `/api/auth/[...nextauth]` | * | NextAuth |
| 4 | `/api/auth/saml/authorize` | GET | None |
| 5 | `/api/auth/saml/callback` | POST | None |
| 6 | `/api/auth/saml/token` | POST | None |
| 7 | `/api/auth/saml/userinfo` | GET | None |
| 8 | `/api/oidc/.well-known/openid-configuration` | GET | None |
| 9 | `/api/oidc/authorize` | GET | Session |
| 10 | `/api/oidc/token` | POST | Client credentials |
| 11 | `/api/oidc/jwks` | GET | None |
| 12 | `/api/oidc/userinfo` | GET | Bearer token |
| 13 | `/api/(internal)/pipeline` | POST | CRON_SECRET |
| 14 | `/api/cron/campaigns` | GET | CRON_SECRET |
| 15 | `/api/billing/stripe-webhook` | POST | Stripe signature |

### v1 Client API

| # | Path | Methods | Auth |
|---|------|---------|------|
| 16 | `/api/v1/client/[envId]/environment` | GET, OPTIONS | None |
| 17 | `/api/v1/client/[envId]/app/sync/[userId]` | GET, OPTIONS | None |
| 18 | `/api/v1/client/[envId]/displays` | POST, OPTIONS | None |
| 19 | `/api/v1/client/[envId]/responses` | POST, OPTIONS | None |
| 20 | `/api/v1/client/[envId]/responses/[responseId]` | PUT, OPTIONS | None |
| 21 | `/api/v1/client/[envId]/storage` | POST, OPTIONS | None |
| 22 | `/api/v1/client/[envId]/identify/contacts/[userId]` | GET, OPTIONS | None |
| 23 | `/api/v1/client/[envId]/contacts/[userId]/attributes` | PUT, OPTIONS | None |
| 24 | `/api/v1/client/[envId]/user` | POST, OPTIONS | None |
| 25 | `/api/v1/client/[envId]/ivr/[surveyId]` | GET, OPTIONS | None |
| 26 | `/api/v1/client/[envId]/ivr/[surveyId]/responses` | POST, OPTIONS | None |
| 27 | `/api/v1/client/[envId]/ivr/[surveyId]/media/[questionId]` | GET, OPTIONS | None |

### v1 Management API

| # | Path | Methods | Auth |
|---|------|---------|------|
| 28 | `/api/v1/management/me` | GET | API Key or Session |
| 29 | `/api/v1/management/surveys` | GET, POST | API Key |
| 30 | `/api/v1/management/surveys/[surveyId]` | GET, PUT, DELETE | API Key |
| 31 | `/api/v1/management/surveys/[surveyId]/singleUseIds` | GET | API Key |
| 32 | `/api/v1/management/responses` | GET, POST | API Key |
| 33 | `/api/v1/management/responses/[responseId]` | GET, PUT, DELETE | API Key |
| 34 | `/api/v1/management/action-classes` | GET, POST | API Key |
| 35 | `/api/v1/management/action-classes/[id]` | GET, PUT, DELETE | API Key |
| 36 | `/api/v1/management/contacts` | GET | API Key |
| 37 | `/api/v1/management/contacts/[contactId]` | GET, DELETE | API Key |
| 38 | `/api/v1/management/contact-attribute-keys` | GET, POST | API Key |
| 39 | `/api/v1/management/contact-attribute-keys/[id]` | GET, PUT, DELETE | API Key |
| 40 | `/api/v1/management/contact-attributes` | GET | API Key |
| 41 | `/api/v1/management/storage` | POST | API Key or Session |
| 42 | `/api/v1/management/channels` | GET, POST | API Key |
| 43 | `/api/v1/management/channels/[channelId]` | GET, PUT, DELETE | API Key |
| 44 | `/api/v1/management/tenants` | GET, POST | API Key |
| 45 | `/api/v1/management/tenants/[orgId]` | GET, PATCH, DELETE | API Key |
| 46 | `/api/v1/management/tenants/[orgId]/branding` | GET, PATCH | API Key |
| 47 | `/api/v1/management/tenants/[orgId]/credentials` | GET, POST | API Key |
| 48 | `/api/v1/management/tenants/[orgId]/license` | GET, POST, PATCH | API Key |
| 49 | `/api/v1/management/tenants/[orgId]/quotas` | GET, PATCH | API Key |
| 50 | `/api/v1/management/tenants/[orgId]/workflows` | GET, POST | API Key |
| 51 | `/api/v1/management/tenants/[orgId]/workflows/[workflowId]` | DELETE | API Key |
| 52 | `/api/v1/management/analytics/superset-token` | GET | API Key |
| 53 | `/api/v1/management/bot-connector/bots` | GET | API Key |
| 54 | `/api/v1/management/bot-connector/turn` | POST | API Key |
| 55 | `/api/v1/management/license/activate` | POST | API Key |
| 56 | `/api/v1/management/license/activate-offline` | POST | API Key |

### v1 Webhooks

| # | Path | Methods | Auth |
|---|------|---------|------|
| 57 | `/api/v1/webhooks` | GET, POST | API Key |
| 58 | `/api/v1/webhooks/[webhookId]` | GET, DELETE | API Key |

### v1 Integrations

| # | Path | Methods | Auth |
|---|------|---------|------|
| 59 | `/api/v1/integrations/slack` | GET | Session |
| 60 | `/api/v1/integrations/slack/callback` | GET | Session |
| 61 | `/api/v1/integrations/notion` | GET | Session |
| 62 | `/api/v1/integrations/notion/callback` | GET | Session |
| 63 | `/api/v1/integrations/airtable` | GET | Session |
| 64 | `/api/v1/integrations/airtable/callback` | GET | Session |
| 65 | `/api/v1/integrations/airtable/tables` | GET | Session |
| 66 | `/api/v1/integrations/analytics/superset-token` | GET | Session |
| 67 | `/api/v1/integrations/analytics/dashboards` | GET | Session |
| 68 | `/api/google-sheet` | GET | Session |
| 69 | `/api/google-sheet/callback` | GET | Session |

### v1 Other

| # | Path | Methods | Auth |
|---|------|---------|------|
| 70 | `/api/v1/notifications/sms-inbound` | POST | None |

### v2 Client API

| # | Path | Methods | Auth |
|---|------|---------|------|
| 71 | `/api/v2/client/[envId]/environment` | GET, OPTIONS | None |
| 72 | `/api/v2/client/[envId]/displays` | POST, OPTIONS | None |
| 73 | `/api/v2/client/[envId]/responses` | POST, OPTIONS | None |
| 74 | `/api/v2/client/[envId]/responses/[responseId]` | PUT, OPTIONS | None |
| 75 | `/api/v2/client/[envId]/storage` | POST, OPTIONS | None |
| 76 | `/api/v2/client/[envId]/identify/contacts/[userId]` | GET, OPTIONS | None |
| 77 | `/api/v2/client/[envId]/contacts/[userId]/attributes` | PUT, OPTIONS | None |
| 78 | `/api/v2/client/[envId]/user` | POST, OPTIONS | None |

### v2 Management API

| # | Path | Methods | Auth |
|---|------|---------|------|
| 79 | `/api/v2/management/responses` | GET, POST | Module-delegated |
| 80 | `/api/v2/management/responses/[responseId]` | GET, PUT, DELETE | Module-delegated |
| 81 | `/api/v2/management/webhooks` | GET, POST | Module-delegated |
| 82 | `/api/v2/management/webhooks/[webhookId]` | GET, PUT, DELETE | Module-delegated |
| 83 | `/api/v2/management/contacts` | POST | Module-delegated |
| 84 | `/api/v2/management/contacts/bulk` | PUT | Module-delegated |
| 85 | `/api/v2/management/contact-attribute-keys` | GET, POST | Module-delegated |
| 86 | `/api/v2/management/contact-attribute-keys/[id]` | GET, PUT, DELETE | Module-delegated |
| 87 | `/api/v2/management/surveys/[surveyId]/contact-links/contacts/[contactId]` | GET | Module-delegated |
| 88 | `/api/v2/management/surveys/[surveyId]/contact-links/segments/[segmentId]` | GET | Module-delegated |

### v2 Platform API

| # | Path | Methods | Auth |
|---|------|---------|------|
| 89 | `/api/v2/me` | GET | Module-delegated |
| 90 | `/api/v2/health` | GET | None |
| 91 | `/api/v2/roles` | GET | Module-delegated |
| 92 | `/api/v2/organizations/[orgId]/users` | GET, POST, PATCH | Module-delegated |
| 93 | `/api/v2/organizations/[orgId]/teams` | GET, POST | Module-delegated |
| 94 | `/api/v2/organizations/[orgId]/teams/[teamId]` | GET, PUT, DELETE | Module-delegated |
| 95 | `/api/v2/organizations/[orgId]/project-teams` | GET, POST, PUT, DELETE | Module-delegated |

---

**Total route files:** 95
**Total endpoint combinations (method + path):** ~215 (including OPTIONS handlers)
