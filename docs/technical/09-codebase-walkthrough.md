# 09 - Codebase Walkthrough

This document provides a detailed walkthrough of the HiveCFM codebase, covering key modules, patterns, data flows, and architectural decisions. It is intended for developers onboarding to the project or investigating specific subsystems.

---

## 1. Code Organization

HiveCFM is a **pnpm monorepo** managed by **Turborepo**. The workspace is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Top-Level Structure

```
hivecfm-core/
  apps/
    web/              # Main Next.js application (admin dashboard + public survey pages)
    license-portal/   # License management portal
    storybook/        # Component storybook
  packages/
    database/         # Prisma client, schema, migrations, seeds
    types/            # Shared TypeScript types + Zod schemas
    js-core/          # JavaScript SDK core (browser-side)
    surveys/          # Survey rendering engine (Preact-based)
    survey-ui/        # Shared survey UI primitives
    logger/           # Structured logging (pino-based)
    storage/          # File/blob storage abstraction (S3, local)
    cache/            # Caching layer (Redis)
    email/            # Email templates and sending
    i18n-utils/       # Internationalization utilities
    config-eslint/    # Shared ESLint configuration
    config-prettier/  # Shared Prettier configuration
    config-typescript/# Shared TypeScript configuration
    license-crypto/   # License key encryption/validation
    vite-plugins/     # Custom Vite build plugins
  docker/             # Docker build files
  scripts/            # Build and CI helper scripts
  superset/           # Apache Superset configuration for analytics
  helm-chart/         # Kubernetes Helm chart for deployment
  nginx/              # Nginx reverse proxy configuration
```

### Package Naming Convention

All packages use the `@hivecfm/` scope. For example:
- `@hivecfm/database` -- Prisma client and schema
- `@hivecfm/types` -- Shared type definitions
- `@hivecfm/web` -- The main Next.js application
- `@hivecfm/js-core` -- Browser JavaScript SDK

### Module Organization Within `apps/web`

Inside the main web application, code is organized by feature domain:

```
apps/web/
  app/                # Next.js App Router pages and API routes
  modules/            # Feature modules (domain-driven)
    survey/           # Survey creation, editing, follow-ups
    analytics/        # Apache Superset embedded dashboards
    auth/             # Authentication (NextAuth)
    campaigns/        # Campaign management
    channels/         # Multi-channel (SMS, WhatsApp, voice)
    ee/               # Enterprise-only features (contacts, teams, billing, audit logs)
    ui/               # Shared UI components (design system)
    integrations/     # Third-party integrations (Slack, Notion, Airtable)
    ...
  lib/                # Shared server-side utilities and service layers
  locales/            # i18n translation files (JSON per locale)
```

---

## 2. Next.js App Router

The web application uses the **Next.js App Router** (introduced in Next.js 13+). All page routes live under `apps/web/app/`.

### 2.1 Page Routing Structure

Routes are organized using Next.js **route groups** (parenthesized directories that do not affect the URL):

```
app/
  (app)/                          # Authenticated application shell
    layout.tsx                    # App layout with session, Chatwoot, toast
    (survey-editor)/              # Survey editor (separate layout)
      environments/[environmentId]/
        surveys/[surveyId]/edit/
    (onboarding)/                 # First-time setup flow
      organizations/
      environments/
    environments/[environmentId]/ # Main dashboard
      surveys/                    # Survey list and details
      (contacts)/                 # Contacts, attributes, segments
      analytics/                  # Analytics dashboards
      campaigns/                  # Campaign management
      settings/                   # Environment/project settings
      insights/                   # Response insights
  (auth)/                         # Authentication pages
    auth/
      login/
      signup/
      forgot-password/
    invite/                       # Team invitation acceptance
    verify-email-change/
  (redirects)/                    # Legacy URL redirects
  api/                            # API route handlers
    (internal)/pipeline/          # Internal response processing pipeline
    v1/client/                    # Public client-side API (SDK calls)
    v1/management/                # Management API (API key authenticated)
    v1/integrations/              # Integration endpoints (analytics, Slack, etc.)
    v1/webhooks/                  # Webhook registration
    v1/notifications/             # HiveCFM notification callbacks
  s/[surveyId]/                   # Public survey link pages
  c/                              # Contact-specific survey pages
  health/                         # Health check endpoint
  setup/                          # Initial instance setup
```

### 2.2 Layout Hierarchy

Layouts nest from root to leaf. The hierarchy is:

1. **Root Layout** (`app/layout.tsx`) -- Sets up `<html>` and `<body>`, injects Sentry monitoring, i18n provider, and global CSS. This is a **server component**.

```typescript
// app/layout.tsx (simplified)
const RootLayout = async ({ children }) => {
  const locale = await getLocale();
  return (
    <html lang={locale} translate="no">
      <body>
        <SentryProvider ...>
          <I18nProvider language={locale} defaultLanguage={DEFAULT_LOCALE}>
            {children}
          </I18nProvider>
        </SentryProvider>
      </body>
    </html>
  );
};
```

2. **App Layout** (`app/(app)/layout.tsx`) -- Validates the user session via `getServerSession(authOptions)`. If the user account is deactivated (`user.isActive === false`), renders `<ClientLogout />`. Otherwise provides toast notifications and the Chatwoot support widget.

3. **Environment Layout** (`app/(app)/environments/[environmentId]/layout.tsx`) -- Loads environment-specific data, sets up the sidebar navigation, and injects the environment context for child pages.

4. **Auth Layout** (`app/(auth)/layout.tsx`) -- Minimal layout for login/signup pages (no sidebar, no session).

### 2.3 Server Components vs Client Components

HiveCFM follows the Next.js convention of defaulting to **server components** for data-fetching pages and using the `"use client"` directive for interactive components.

**Server components** (no directive):
- All `page.tsx` files that fetch data from the database
- Layout files that check session/permissions
- The analytics page (`modules/analytics/page.tsx`) -- fetches environment auth, renders `<SupersetEmbed>` as a child

**Client components** (`"use client"` at top):
- `SurveyEditor` -- complex interactive form editing
- `SurveyMenuBar` -- save/publish buttons with loading states
- `SupersetEmbed` -- iframe management with token refresh
- `PreviewSurvey` -- live survey preview in the editor sidebar
- All form inputs, modals, and interactive UI components

### 2.4 Middleware

The middleware (`apps/web/middleware.ts`) runs on every request (except static assets). It performs two key functions:

**Domain-Aware Routing**: When `PUBLIC_URL` is configured separately from `WEBAPP_URL`, the middleware enforces route isolation between the public-facing domain (survey links, client APIs) and the admin domain (dashboard, management APIs). This is done via `isRouteAllowedForDomain()` which uses a whitelist approach.

**Authentication**: For protected routes (`/environments`, `/setup/organization`, `/organizations`), the middleware checks for a valid NextAuth JWT. Unauthenticated requests are redirected to `/auth/login` with the original URL as a callback parameter.

**Request Enrichment**: Every request gets a unique `x-request-id` (UUID v4) and `x-start-time` header for tracing and performance monitoring.

```typescript
// middleware.ts (core flow)
export const middleware = async (originalRequest: NextRequest) => {
  // 1. Domain routing check
  const domainResponse = handleDomainAwareRouting(originalRequest);
  if (domainResponse) return domainResponse;

  // 2. Enrich with request ID and timing
  request.headers.set("x-request-id", uuidv4());
  request.headers.set("x-start-time", Date.now().toString());

  // 3. Authentication check
  const authResponse = await handleAuth(request);
  if (authResponse) return authResponse;

  return NextResponse.next({ request: { headers: request.headers } });
};
```

The matcher excludes static files, fonts, and animated backgrounds:
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|js|css|images|fonts|icons|public|animated-bgs).*)",
  ],
};
```

### 2.5 API Route Handlers Pattern

API routes follow a consistent pattern across the codebase:

**Client-side API** (`/api/v1/client/[environmentId]/...`): Used by the JavaScript SDK. No authentication required -- identified by environment ID. Rate-limited.

**Management API** (`/api/v1/management/...`): Used by external systems. Authenticated via API key in the `x-api-key` header.

**Integration API** (`/api/v1/integrations/...`): Used by third-party services (Slack OAuth, analytics). Session-authenticated.

**Internal API** (`/api/(internal)/pipeline/`): Used internally for async processing. Authenticated via `CRON_SECRET`.

All API routes use the `responses` utility object for standardized response formatting:

```typescript
// app/lib/api/response.ts
export const responses = {
  successResponse,      // 200 with { data: ... }
  badRequestResponse,   // 400 with { code, message, details }
  notFoundResponse,     // 404
  forbiddenResponse,    // 403
  notAuthenticatedResponse, // 401
  tooManyRequestsResponse,  // 429
  internalServerErrorResponse, // 500
};
```

Client-side API responses include CORS headers (`Access-Control-Allow-Origin: *`).

The `withV1ApiWrapper` higher-order function wraps API handlers with:
- Route type detection (client, management, integration)
- Authentication (API key or session-based)
- Rate limiting
- Sentry error tracking
- Audit logging (when enabled)

---

## 3. Key Modules Walkthrough

### 3.a Survey Editor

The survey editor is the most complex module in the application. It lives at `apps/web/modules/survey/editor/` and provides the full survey creation and editing experience.

#### Entry Point and Component Tree

The editor page is accessible at `/environments/[environmentId]/surveys/[surveyId]/edit`. The entry component is `SurveyEditor` (`components/survey-editor.tsx`), a `"use client"` component that receives server-fetched props including the survey data, project settings, available segments, and feature flags.

```
SurveyEditor
  +-- SurveyMenuBar          (top bar: save, publish, back)
  +-- SurveyReviewPanel       (shown when survey is under review)
  +-- SurveyEditorTabs        (tab navigation: elements, styling, settings, follow-ups)
  +-- ElementsView            (question/block editor)
  |     +-- BlockCard         (individual block with drag-and-drop)
  |     +-- AddElementButton  (add new question types)
  |     +-- LogicEditor       (conditional logic rules)
  +-- StylingView             (theme, colors, background images)
  +-- SettingsView            (targeting, triggers, auto-complete)
  +-- FollowUpsView           (email follow-up configuration)
  +-- PreviewSurvey           (live preview panel, right sidebar)
  +-- VoicePreviewPanel       (for voice channel surveys)
  +-- MessagingPreviewPanel   (for messaging channel surveys)
```

#### State Management in the Editor

The editor uses **local component state** rather than a global store. The key state variables in `SurveyEditor`:

- `localSurvey` -- A deep clone of the server survey, modified in-memory as the user edits. Only persisted to the database on explicit save/publish.
- `activeView` -- Which tab is shown (`"elements"`, `"styling"`, `"settings"`, `"followUps"`)
- `activeElementId` -- Which question/element is currently selected for editing
- `invalidElements` -- List of element IDs that failed validation
- `selectedLanguageCode` -- Current language being edited (for multi-language surveys)
- `localStylingChanges` -- Theme/styling overrides

The `setLocalSurvey` function is threaded through all child components, allowing any child to update the survey state and have changes reflected across the editor.

#### Survey Creation Flow

1. User clicks "Create Survey" from the surveys list page
2. A new survey record is created in the database with `status: "draft"` and default blocks
3. User is redirected to the editor page (`/environments/[envId]/surveys/[surveyId]/edit`)
4. The editor loads the survey via server component data fetching
5. `SurveyEditor` receives the survey and creates a local clone via `structuredClone()`

#### Question Editor Components

Each question type has a dedicated form component in `components/`:

- `open-element-form.tsx` -- Open text input questions
- `nps-element-form.tsx` -- Net Promoter Score (0-10 scale)
- `rating-type-dropdown.tsx` -- Star/smiley/number ratings
- `consent-element-form.tsx` -- Consent checkbox
- `picture-selection-form.tsx` -- Image selection grids
- `matrix-element-form.tsx` -- Matrix/grid questions
- `address-element-form.tsx` -- Address fields
- `file-upload-element-form.tsx` -- File upload

Elements are organized in **blocks** (`BlockCard`, `BlocksDroppable`), which group related questions together. The drag-and-drop interface is powered by `@dnd-kit`.

#### Logic Editor

The logic editor (`logic-editor.tsx`, `logic-editor-conditions.tsx`, `logic-editor-actions.tsx`) allows survey creators to define conditional branching:

- **Conditions** -- Rules based on response values (e.g., "if rating < 7")
- **Actions** -- What happens when conditions are met (skip to question, show/hide elements)

The logic engine implementation lives in `lib/logic-rule-engine.ts` with comprehensive test coverage in `lib/logic-rule-engine.test.ts`.

#### Publishing Logic

The `SurveyMenuBar` component (`components/survey-menu-bar.tsx`) controls the save and publish workflow. The flow differs based on the user's role:

**For Admin Users (owner/manager):**
1. **Save Draft** -- Calls `updateSurveyDraftAction()` which uses `updateSurveyDraft()` internally. This skips full Zod validation, allowing incomplete surveys to be saved.
2. **Publish** -- Calls `handleSurveyPublish()`:
   - Validates the survey against `ZSurvey` (full Zod schema)
   - Runs `isSurveyValid()` for business logic validation (language completeness, required fields)
   - Cleans up `isDraft` flags from elements
   - Sets `status: "inProgress"`
   - Redirects to the survey summary page

**For Regular Members:**
1. **Save Draft** -- Same as admin
2. **Submit for Review** -- Calls `handleSubmitForReview()`:
   - Validates the survey
   - Saves the draft
   - Calls `submitForReviewAction()` which sets `status: "underReview"`
   - Creates a `SurveyReviewLog` entry
   - Redirects to the summary page

**Review Workflow** (admin only):
- `approveSurveyAction()` -- Transitions `underReview` to `inProgress`
- `rejectSurveyAction()` -- Transitions `underReview` back to `draft` with a `reviewNote`

Status transitions are enforced by `lib/status-transitions.ts`:

```typescript
const ADMIN_TRANSITIONS = {
  draft: ["inProgress", "underReview"],
  underReview: ["inProgress", "draft"],
  inProgress: ["paused", "completed"],
  paused: ["inProgress", "completed"],
  completed: [],
};

const MEMBER_TRANSITIONS = {
  draft: ["underReview"],
  underReview: [],
  inProgress: [],
  paused: [],
  completed: [],
};
```

#### Validation

Survey validation happens at two levels:

1. **Zod Schema Validation** (`validateSurveyWithZod()` in the menu bar) -- Validates the full survey structure against `ZSurvey`. Catches structural issues and highlights invalid elements in the UI.

2. **Business Logic Validation** (`lib/validation.ts`) -- Checks for:
   - Label completeness across all enabled languages (`isLabelValidForAllLanguages()`)
   - Duplicate choice labels in multiple-choice questions
   - Matrix row/column label uniqueness
   - Contact info field configuration
   - Segment filter validity
   - Empty fallback values for recall/piping

#### Server Actions

All server-side mutations go through Next.js Server Actions defined in `editor/actions.ts`. These use the `authenticatedActionClient` wrapper which:

1. Parses input with Zod schemas
2. Verifies user authentication
3. Checks authorization (organization role + project team permissions)
4. Wraps the operation with audit logging via `withAuditLogging()`
5. Revalidates the relevant Next.js cache path after mutation

### 3.b Response Engine

Survey responses flow through a multi-stage pipeline from submission to storage and downstream processing.

#### Response Submission (Client API)

The primary entry point is `POST /api/v1/client/[environmentId]/responses/` (`app/api/v1/client/[environmentId]/responses/route.ts`).

**Request Processing:**

1. Parse and validate the JSON body against `ZResponseInput`
2. Validate the `environmentId` parameter
3. Check if user identification is allowed (enterprise feature gate)
4. Verify the survey exists and belongs to the environment
5. Validate file upload references in response data
6. **License enforcement** -- Check license validity and completed response quota before creating the response
7. Enrich with server-derived metadata:
   - User agent parsing (browser, device, OS via `ua-parser-js`)
   - Country detection from headers (`CF-IPCountry`, `X-Vercel-IP-Country`, `CloudFront-Viewer-Country`)
   - IP address capture (if `survey.isCaptureIpEnabled`)

**Response Creation:**

```typescript
// Simplified flow
const response = await createResponseWithQuotaEvaluation({
  ...responseInputData,
  meta,  // server-enriched metadata
});
```

The `createResponseWithQuotaEvaluation()` function wraps the response creation in a database **transaction** that also evaluates survey quotas atomically. This prevents race conditions where multiple responses could exceed a configured quota.

Inside the transaction:
1. `createResponse()` -- Resolves the contact (if `userId` provided), calculates TTC (time-to-complete) totals, builds Prisma data, and inserts the response record
2. `evaluateResponseQuotas()` -- Checks if any configured quotas (per-question, per-answer-value) have been exceeded

**Pipeline Dispatch:**

After response creation, the route fires pipeline events asynchronously:

```typescript
sendToPipeline({
  event: "responseCreated",
  environmentId, surveyId, response,
});

if (responseInput.finished) {
  sendToPipeline({
    event: "responseFinished",
    environmentId, surveyId, response,
  });
}
```

`sendToPipeline()` (`app/lib/pipelines.ts`) makes an internal HTTP call to `/api/pipeline` with the `CRON_SECRET` for authentication. This decouples the response storage from downstream processing.

#### Pipeline Processing

The pipeline handler (`app/api/(internal)/pipeline/route.ts`) processes response events asynchronously:

**For `responseFinished` events:**
1. **License quota check** -- Verify the organization hasn't exceeded completed response limits
2. **Integrations** -- Forward responses to configured integrations (Google Sheets, Airtable, Notion, Slack) via `handleIntegrations()`
3. **HiveCFM Hub** -- Push response data to the central hub for aggregation (`pushResponseToHub()`)
4. **Email notifications** -- Send response alerts to users with notifications enabled
5. **Follow-up emails** -- Process any configured follow-up email rules (`sendFollowUpsForResponse()`)
6. **Auto-complete** -- If `survey.autoComplete` threshold is reached, transition survey to `"completed"` status
7. **Webhooks** -- Fire configured webhooks with Standard Webhooks signatures
8. **Audit logging** -- Log the event for compliance

**For `responseCreated` events:**
1. **Webhooks** -- Fire configured webhooks
2. **Telemetry** -- Send telemetry events

All webhook calls use a 5-second timeout via `fetchWithTimeout()` and are dispatched in parallel using `Promise.allSettled()` to prevent one failing webhook from blocking others.

#### Response Update Flow

Response updates go through `PUT /api/v1/client/[environmentId]/responses/[responseId]/` which handles partial response submissions (multi-page surveys where responses are updated incrementally).

### 3.c Analytics Module

The analytics module (`apps/web/modules/analytics/`) provides embedded Apache Superset dashboards.

**Files:**
- `page.tsx` -- Server component that renders the page header and `SupersetEmbed`
- `components/SupersetEmbed.tsx` -- Client component managing the dashboard iframe
- `index.ts` -- Module exports

#### SupersetEmbed Component

The `SupersetEmbed` component is a `"use client"` component that:

1. **Fetches available dashboards** from `/api/v1/integrations/analytics/dashboards` on mount
2. **Requests a guest token** from `/api/v1/integrations/analytics/superset-token?dashboard=<name>` when a dashboard is selected
3. **Renders an iframe** pointing to the Superset dashboard URL with the guest token
4. **Auto-refreshes the token** every 13 minutes (tokens expire after 15 minutes)

```typescript
// Token refresh interval: 2 minutes before 15-min expiry
const TOKEN_REFRESH_INTERVAL_MS = 13 * 60 * 1000;
```

The refresh uses `setInterval` stored in a `useRef` to prevent memory leaks:

```typescript
useEffect(() => {
  if (!guestToken || !selectedDashboard) return;
  if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
  refreshTimerRef.current = setInterval(() => {
    fetchGuestToken(selectedDashboard, true); // true = silent refresh
  }, TOKEN_REFRESH_INTERVAL_MS);
  return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
}, [guestToken, selectedDashboard, fetchGuestToken]);
```

The iframe is sandboxed with `allow-scripts allow-same-origin allow-popups allow-forms`.

#### Dashboard Selection

When multiple dashboards are configured, a `<Select>` dropdown allows switching between them. Each selection triggers a new guest token fetch. The component handles loading, error, and empty states with appropriate UI feedback.

### 3.d Contact/People Module

Contact management is an enterprise (`ee/`) feature at `apps/web/modules/ee/contacts/`.

#### Contact Pages

```
(contacts)/
  contacts/
    page.tsx                    # Contact list with search and filters
    [contactId]/
      page.tsx                  # Individual contact detail
  attributes/
    page.tsx                    # Attribute key management
  segments/
    page.tsx                    # Segment definitions
```

#### Contact Identification

Contacts are identified by a `userId` string provided via the JavaScript SDK:

```typescript
// In the browser SDK
hivecfm.setUserId("user-123");
```

When a response is submitted with a `userId`, the response creation logic calls `getContactByUserId(environmentId, userId)` to link the response to an existing contact or create a new one.

#### Attribute Tracking

Contact attributes are key-value pairs with two types:
- **Default attributes** (`ContactAttributeType.default`) -- System-defined (e.g., `email`, `userId`)
- **Custom attributes** (`ContactAttributeType.custom`) -- User-defined via the SDK or API

Attributes are stored in the `ContactAttribute` table with a unique constraint on `(contactId, attributeKeyId)`. Attribute keys are scoped to environments via the `ContactAttributeKey` model.

The SDK allows setting attributes:
```typescript
hivecfm.setAttribute("plan", "enterprise");
hivecfm.setAttributes({ plan: "enterprise", role: "admin" });
hivecfm.setEmail("user@example.com");
```

#### Segmentation

Segments define dynamic groups of contacts based on filter conditions. The segment editor (`segments/components/segment-editor.tsx`) provides a visual filter builder. Filters are validated against `ZSegmentFilters` and stored as JSON in the `Segment` model.

Segments can be:
- **Public** -- Reusable across multiple surveys
- **Private** -- Created automatically when a survey has custom targeting rules (linked to a single survey)

Contact detail pages show:
- Attribute values (`attributes-section.tsx`)
- Response timeline (`response-timeline.tsx`)
- Response feed (`response-feed.tsx`)
- Personal survey link generation (`generate-personal-link-modal.tsx`)

---

## 4. Shared Packages

### 4.a packages/database

The database package provides the Prisma ORM client and schema definition.

**Key Files:**
- `schema.prisma` -- Full database schema (PostgreSQL with pgvector extension)
- `src/client.ts` -- Singleton Prisma client with connection pooling
- `src/index.ts` -- Re-exports client and JSON types
- `src/seed.ts` -- Database seeding script
- `migration/` -- Ordered SQL migrations (Prisma Migrate format)
- `src/scripts/migration-runner.ts` -- Custom data migration runner
- `json-types.ts` -- Type augmentations for Prisma JSON columns

**Client Singleton Pattern:**

```typescript
// packages/database/src/client.ts
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    ...(process.env.DEBUG === "1" && { log: ["query", "info"] }),
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

This prevents multiple Prisma Client instances during development hot-reloads.

**Schema Highlights:**
- Uses PostgreSQL with the `pgvector` extension for vector embeddings
- `prisma-json-types-generator` for typed JSON columns
- Key models: `Survey`, `Response`, `Contact`, `ContactAttribute`, `Environment`, `Project`, `Organization`, `Webhook`, `Integration`

**Migrations:**

Migrations follow the naming convention `YYYYMMDDHHMMSS_description`. Recent migrations include:
- `20260306180000_add_voice_survey_type`
- `20260310000000_add_superset_views`
- `20260307000000_add_tenant_license`

Custom data migrations are handled by `migration-runner.ts`, separate from Prisma schema migrations.

### 4.b packages/types

The types package contains all shared TypeScript type definitions and Zod validation schemas. Types are defined as `.ts` files at the package root (not in `src/`).

**Key Type Files:**

| File | Purpose |
|------|---------|
| `responses.ts` | `TResponse`, `TResponseInput`, `ZResponseInput`, `TResponseData` |
| `surveys/types.ts` | `TSurvey`, `ZSurvey`, `TSurveyStatus`, `TSurveyEditorTabs` |
| `surveys/elements.ts` | Element types (open text, NPS, rating, matrix, etc.) |
| `errors.ts` | Custom error classes with HTTP status codes |
| `segment.ts` | `TSegment`, `ZSegmentFilters` |
| `contact-attribute.ts` | `TContactAttributes` |
| `environment.ts` | `TEnvironment`, `ZEnvironmentId` |
| `organizations.ts` | `TOrganization` |
| `project.ts` | Project-level types |
| `auth.ts` | `TAuthenticationApiKey` |
| `quota.ts` | `TSurveyQuota`, `TResponseWithQuotaFull` |
| `styling.ts` | Survey styling/theming types |
| `tenant.ts` | Multi-tenant configuration |

**Zod Schema Convention:**

Types and schemas follow a naming convention:
- `T` prefix for TypeScript types: `TSurvey`, `TResponse`
- `Z` prefix for Zod schemas: `ZSurvey`, `ZResponseInput`
- Schemas are used for both runtime validation and type inference

```typescript
// Example from responses.ts
export const ZResponseData = z.record(ZResponseDataValue);
export type TResponseData = z.infer<typeof ZResponseData>;
```

**Error Types:**

The `errors.ts` file defines a hierarchy of domain-specific errors, each with an HTTP status code:

```typescript
ResourceNotFoundError  // 404
InvalidInputError      // 400
ValidationError        // 400
DatabaseError          // 500
UniqueConstraintError  // 409
OperationNotAllowedError // 403
AuthenticationError    // 401
AuthorizationError     // 403
TooManyRequestsError   // 429
```

These errors are caught by API route handlers and converted to appropriate HTTP responses.

### 4.c packages/js-core

The JavaScript SDK core provides the browser-side API for embedding surveys and tracking user interactions. It is designed to be loaded via a `<script>` tag or npm package.

**Architecture:**

```
js-core/src/
  index.ts              # Public API surface (setup, setUserId, track, etc.)
  types/
    config.ts           # SDK configuration types
    api.ts              # API client types
    response.ts         # Response submission types
    survey.ts           # Survey display types
    storage.ts          # Local storage types
    error.ts            # Result/Error types
  lib/
    common/
      setup.ts          # Initialization and configuration
      config.ts         # Config singleton (localStorage-backed)
      command-queue.ts  # Ordered command execution queue
      api.ts            # HTTP client for server communication
      event-listeners.ts # DOM event listeners (page visibility, etc.)
      utils.ts          # Survey filtering, expiry checks
      logger.ts         # Client-side logging
      status.ts         # SDK initialization status
      constants.ts      # Storage keys, defaults
      recaptcha.ts      # reCAPTCHA integration
    user/
      user.ts           # User identification (setUserId)
      attribute.ts      # Attribute management (setAttribute)
      state.ts          # User state management
      update.ts         # Batched attribute updates to backend
      update-queue.ts   # Queue for batching user updates
    environment/
      state.ts          # Environment state (surveys, config)
    survey/
      widget.ts         # Survey rendering (modal/inline)
      action.ts         # Action tracking (code actions)
      no-code-action.ts # URL-based trigger evaluation
      store.ts          # Survey display state
```

**Public API:**

```typescript
const hivecfm = {
  setup,              // Initialize the SDK with environment ID and app URL
  setUserId,          // Identify a user
  setEmail,           // Set email attribute
  setAttribute,       // Set a single custom attribute
  setAttributes,      // Set multiple custom attributes
  setLanguage,        // Set the user's language
  track,              // Track a custom action (triggers survey display)
  logout,             // Clear user identification
  registerRouteChange, // Notify SDK of SPA route changes
  setNonce,           // Set CSP nonce for inline styles
};
```

**Command Queue:**

All public API calls go through a `CommandQueue` singleton that ensures ordered execution and prevents race conditions:

```typescript
const queue = CommandQueue.getInstance();

const setup = async (setupConfig: TConfigInput): Promise<void> => {
  await queue.add(Setup.setup, CommandType.Setup, false, setupConfig);
  await queue.wait();
  setTimeout(() => { void checkPageUrl(); }, 0);
};
```

The queue has three command types:
- `CommandType.Setup` -- Initialization (runs first, blocks all others)
- `CommandType.UserAction` -- User identification and attribute setting (requires setup)
- `CommandType.GeneralAction` -- Action tracking and route changes

**Config Persistence:**

The `Config` class stores SDK state in `localStorage` under the key defined in `constants.ts`. It includes:
- Environment state (available surveys, action classes)
- User state (userId, attributes)
- SDK status (success/error, expiry)

The `setup()` function includes migration logic for upgrading from legacy config formats.

### 4.d packages/surveys

The surveys package is a **Preact-based** rendering engine that displays surveys in the browser. It is loaded as a separate bundle and communicates with the js-core SDK.

**Entry Point:**

```typescript
// packages/surveys/src/index.ts
export const renderSurvey = (props: SurveyContainerProps) => {
  addStylesToDom();
  addCustomThemeToDom({ styling: props.styling });
  const language = getI18nLanguage(languageCode, props.survey.languages);

  if (mode === "inline") {
    render(h(I18nProvider, { language }, h(RenderSurvey, props)), element);
  } else {
    const modalContainer = document.createElement("div");
    modalContainer.id = "hivecfm-modal-container";
    document.body.appendChild(modalContainer);
    render(h(I18nProvider, { language }, h(RenderSurvey, props)), modalContainer);
  }
};
```

The package exports three rendering modes:
- `renderSurveyInline` -- Embeds survey in an existing DOM element
- `renderSurveyModal` -- Renders as a modal overlay
- `renderSurvey` -- Generic entry (delegates based on `mode`)

The global `window.hivecfmSurveys` object is set up automatically, allowing the js-core SDK to invoke rendering without direct imports.

### 4.e packages/survey-ui

The survey-ui package (`@hivecfm/survey-ui`) provides shared UI primitives used by the surveys rendering package. It includes:

- `lib/utils.ts` -- General UI utility functions
- `lib/video.ts` -- Video embed handling
- `lib/locale.ts` -- Locale resolution
- `lib/story-helpers.tsx` -- Storybook helper utilities

This package is built separately and consumed by both `@hivecfm/surveys` and the web app's `PreviewSurvey` component.

---

## 5. State Management

HiveCFM uses a pragmatic mix of state management approaches rather than a single global store.

### Server State

**Next.js Server Components** -- Data is fetched directly in server components using service functions that call Prisma. No client-side caching layer is needed for initial page loads.

**Server Actions** -- Mutations use Next.js Server Actions (the `"use server"` directive) wrapped with the `authenticatedActionClient` from `@/lib/utils/action-client`. Actions automatically revalidate paths via `revalidatePath()`.

### Client State

**React Local State** -- Most interactive components manage state with `useState` and `useEffect`. The Survey Editor is the prime example, maintaining the entire survey document in local state (`localSurvey`) and syncing to the server only on explicit save.

**react-hot-toast** -- Toast notifications for success/error feedback.

**react-i18next** -- Client-side internationalization with `useTranslation()` hook.

### SDK State (Browser)

**Config Singleton** -- The js-core SDK uses a singleton `Config` class backed by `localStorage`. This persists user identity, environment state, and survey display history across page navigations.

**Command Queue** -- Ensures ordered execution of SDK commands with a priority system.

### No Redux/Zustand

The codebase does not use Redux, Zustand, or React Query. State management is kept simple and colocated with the components that need it. Server-side caching is handled by the `@hivecfm/cache` package (Redis-backed) at the service layer.

---

## 6. Error Handling Patterns

### Custom Error Classes

Domain errors are defined in `packages/types/errors.ts` with HTTP status codes:

```typescript
class ResourceNotFoundError extends Error { statusCode = 404; }
class InvalidInputError extends Error { statusCode = 400; }
class DatabaseError extends Error { statusCode = 500; }
class OperationNotAllowedError extends Error { statusCode = 403; }
```

### API Layer Error Handling

API routes catch domain errors and map them to HTTP responses:

```typescript
// Common pattern in route handlers
try {
  const response = await createResponse(input);
  return responses.successResponse(response, true);
} catch (error) {
  if (error instanceof InvalidInputError) {
    return responses.badRequestResponse(error.message);
  }
  logger.error({ error, url: req.url }, "Error creating response");
  return responses.internalServerErrorResponse(error.message);
}
```

### Server Action Error Handling

Server actions use the `getFormattedErrorMessage()` utility to extract user-friendly messages from action responses:

```typescript
const result = await updateSurveyAction(survey);
if (result?.data) {
  toast.success("Changes saved");
} else {
  const errorMessage = getFormattedErrorMessage(result);
  toast.error(errorMessage);
}
```

### Zod Validation Errors

Input validation errors from Zod schemas are transformed into detailed error objects via `transformErrorToDetails()` and returned as 400 Bad Request responses with the validation path and message.

### Pipeline Error Resilience

The pipeline uses `Promise.allSettled()` instead of `Promise.all()` to ensure that a single failing webhook or email does not prevent other downstream actions:

```typescript
const results = await Promise.allSettled([...webhookPromises, ...emailPromises]);
results.forEach((result) => {
  if (result.status === "rejected") {
    logger.error({ error: result.reason }, "Promise rejected");
  }
});
```

### Client-Side Error Handling

The SDK uses a `Result` type pattern (inspired by Rust) for operations that can fail:

```typescript
// packages/js-core/src/types/error.ts
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };
```

The `wrapThrows()` utility converts thrown exceptions into Result values for localStorage operations and other fallible calls.

### Global Error Boundaries

- `app/error.tsx` -- Page-level error boundary for Next.js
- `app/global-error.tsx` -- Root error boundary
- `SentryProvider` -- Captures and reports errors to Sentry in production

---

## 7. Testing

### Test Framework

HiveCFM uses **Vitest** as the primary test runner for unit and integration tests. End-to-end tests use **Playwright**.

**Vitest Configuration** (`apps/web/vite.config.mts`):

```typescript
export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    exclude: ["playwright/**", "node_modules/**"],
    setupFiles: ["./vitestSetup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["app/**/*.ts", "modules/**/*.ts", "lib/**/*.ts", "lingodotdev/**/*.ts"],
    },
  },
  plugins: [tsconfigPaths(), react()],
});
```

Key configuration decisions:
- Node environment by default; `jsdom` for `.test.tsx` files (component tests)
- Coverage excludes: `.tsx` files (covered by E2E), route handlers, middleware, type definitions, constants, Server Actions, Storybook stories, and third-party integration modules

**Workspace Configuration** (`vitest.workspace.ts`):

```typescript
export default ["packages/*/vite.config.{ts,mts}", "apps/**/vite.config.{ts,mts}"];
```

This allows running tests across all packages with a single `pnpm test` command.

### Test Organization

Tests are colocated with the code they test, following the `*.test.ts` naming convention:

```
modules/survey/editor/lib/
  validation.ts
  validation.test.ts
  logic-rule-engine.ts
  logic-rule-engine.test.ts
  blocks.ts
  blocks.test.ts
  status-transitions.ts
  survey.ts
  survey.test.ts
```

Mocks live in `__mocks__/` subdirectories adjacent to the test files:

```
lib/survey/tests/
  __mocks__/
    state.mock.ts
    store.mock.ts
    widget.mock.ts
  store.test.ts
  widget.test.ts
  action.test.ts
```

### Mocking Strategies

**Database Mocking**: A shared database mock at `apps/web/lib/__mocks__/database.ts` provides a mock Prisma client for unit tests.

**Service Mocking**: Vitest's `vi.mock()` is used to mock service-layer functions:

```typescript
// Example from a test file
vi.mock("@/lib/survey/service", () => ({
  getSurvey: vi.fn(),
  updateSurvey: vi.fn(),
}));
```

**Mock Data Files**: Test fixtures are stored in dedicated mock files (e.g., `__mocks__/survey-follow-up.mock.ts`, `__mocks__/update-queue.mock.ts`).

### End-to-End Tests (Playwright)

E2E tests live in `apps/web/playwright/` and cover critical user flows:

- `signup.spec.ts` -- User registration
- `onboarding.spec.ts` -- First-time setup
- `survey.spec.ts` -- Survey creation and management
- `action.spec.ts` -- Action tracking
- `organization.spec.ts` -- Organization management
- `js.spec.ts` -- JavaScript SDK integration

Playwright is configured in `playwright.config.ts` at the repo root, with a separate `playwright.service.config.ts` for Azure CI environments (using 10 parallel workers).

### Running Tests

```bash
pnpm test                    # Run all unit/integration tests
pnpm test:coverage           # Run with coverage reports
pnpm test:e2e                # Run Playwright E2E tests
pnpm test-e2e:azure          # Run E2E in Azure CI (10 workers)
```

---

## 8. Build System

### Turborepo Pipeline

The build is orchestrated by **Turborepo** (`turbo.json`). Each package defines its build tasks, and Turborepo manages the dependency graph.

**Key Build Tasks:**

```
build          -- Production build (depends on ^build of all dependencies)
build:dev      -- Development build (faster, less optimization)
go             -- Development server (db:setup + watch mode)
lint           -- ESLint
test           -- Vitest
db:setup       -- Database migration + seed
db:migrate:dev -- Create new migration
db:seed        -- Seed database
```

**Build Order** (simplified dependency graph):

```
1. @hivecfm/logger          (no dependencies)
2. @hivecfm/cache           (depends on logger)
3. @hivecfm/storage          (depends on logger)
4. @hivecfm/database         (depends on logger + generates Prisma client)
5. @hivecfm/types            (no package dependencies, uses generated Prisma types)
6. @hivecfm/i18n-utils       (depends on types)
7. @hivecfm/survey-ui        (depends on types)
8. @hivecfm/surveys          (depends on types, survey-ui, i18n-utils)
9. @hivecfm/js-core          (depends on types, database)
10. @hivecfm/web             (depends on everything above)
```

**Caching:**

Turborepo caches build outputs (`.next/**`, `dist/**`) and skips rebuilding packages whose inputs haven't changed. Cache keys include:
- File hashes of source code
- Environment variables (the extensive `env` list in `turbo.json` ensures builds are invalidated when config changes)

Non-cacheable tasks: `go`, `dev`, `db:setup`, `db:migrate:dev`, `db:down`, `clean`.

**Development Workflow:**

```bash
pnpm go    # Starts all services: Docker DB, Prisma setup, Next.js dev server, package watchers
```

This runs Turborepo with `--concurrency 20`, launching up to 20 parallel tasks. Persistent tasks (dev servers, watchers) are marked with `"persistent": true`.

### Package Manager

The project uses **pnpm** (v9.15.9) with workspaces. The `pnpm-lock.yaml` is committed for reproducible installs. Security patches are applied via `pnpm.overrides` for transitive dependencies:

```json
"pnpm": {
  "overrides": {
    "axios": ">=1.12.2",
    "node-forge": ">=1.3.2",
    "tar-fs": "2.1.4",
    "typeorm": ">=0.3.26"
  }
}
```

### Pre-commit Hooks

Husky runs `lint-staged` on pre-commit:
- Prettier formatting for `.js`, `.ts`, `.jsx`, `.tsx`, `.json` files
- Prisma format for schema changes

---

## 9. White-Label / Branding

HiveCFM is built on a white-labeled open-source survey platform. The branding transformation is systematic and well-documented (see `docs/WHITELABEL-PATCH.md`).

### Branding Constants

All branding values are centralized in `apps/web/lib/constants.ts`:

```typescript
export const DEFAULT_BRAND_COLOR = "#3B82F6"; // HiveCFM blue
export const FB_LOGO_URL = `${WEBAPP_URL}/hivecfm-logo.svg`;
export const HIVECFM_LOGO_URL = FB_LOGO_URL;
export const DOCS_URL = env.DOCS_URL || "/docs";
export const HIVECFM_SUPPORT_EMAIL = "support@hivecfm.io";

// Enterprise features are always enabled in HiveCFM
export const UPGRADE_URL = "#";
export const LEARN_MORE_LICENSE_URL = "#";
```

The cloud deployment flag:

```typescript
export const IS_HIVECFM_CLOUD = env.IS_HIVECFM_CLOUD === "1";
```

### Metadata and Page Titles

The root layout sets the application name:

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: {
    template: "%s | HiveCFM",
    default: "HiveCFM",
  },
  description: "Customer Feedback Management Platform",
};
```

### Logo and Asset Management

Static assets in `apps/web/public/`:
- `hivecfm-logo.svg` -- Primary logo (SVG)
- `logo-transparent.png` -- Transparent background logo (PNG)
- `favicon/` -- Favicon set (16x16, 32x32, apple-touch-icon)
- `favicon.ico` -- Root favicon

Favicons are referenced in the root layout metadata:

```typescript
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: "/favicon/apple-touch-icon.png",
},
```

### Package Naming

All npm packages use the `@hivecfm/` scope:
- `@hivecfm/database`
- `@hivecfm/types`
- `@hivecfm/surveys`
- `@hivecfm/logger`
- `@hivecfm/web`
- `@hivecfm/js-core`
- etc.

### SDK Global Object

The browser SDK exposes its API on `window.hivecfmSurveys` instead of the original namespace:

```typescript
// packages/surveys/src/index.ts
(globalThis.window as any).hivecfmSurveys = {
  renderSurveyInline,
  renderSurveyModal,
  renderSurvey,
  onFilePick,
  setNonce: setStyleNonce,
};
```

The js-core SDK also references `globalThis.window.hivecfmSurveys` when loading the survey renderer.

### Internationalization

Translation files in `apps/web/locales/` contain HiveCFM-branded strings. The `hivecfm-logo` reference appears in locale files for UI elements that display the brand name.

### Enterprise Feature Gates

Unlike the upstream open-source project which gates features behind paid plans, HiveCFM has enterprise features always enabled:

```typescript
export const UPGRADE_URL = "#"; // Enterprise always enabled in HiveCFM
export const LEARN_MORE_LICENSE_URL = "#"; // Enterprise always enabled in HiveCFM
```

Feature checks remain in the code for structural compatibility but effectively pass through. The tenant licensing system (`lib/tenant/license.ts`, `lib/tenant/license-enforcement.ts`, `lib/tenant/offline-license.ts`) handles HiveCFM-specific license validation, including offline license tokens and hub-based validation.

### Theme Customization

Survey styling is configurable at two levels:

1. **Project-level styling** -- Default theme for all surveys in a project (stored in `Project.styling`)
2. **Survey-level overrides** -- Per-survey styling that overrides project defaults (stored in `Survey.styling`, controlled by `project.styling.allowStyleOverwrite`)

The `StylingView` component in the survey editor allows customizing:
- Brand colors
- Background images (via Unsplash integration or upload)
- Background colors
- Card styling
- Font selection
- Logo placement (controlled by `logo-settings-card.tsx`)
