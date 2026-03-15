# 08 - Logging, Monitoring & Support Operations

## Table of Contents

1. [Observability Overview](#1-observability-overview)
2. [Structured Logging (Pino)](#2-structured-logging-pino)
3. [API Request Logging](#3-api-request-logging)
4. [Sentry Error Tracking](#4-sentry-error-tracking)
5. [Health Check Endpoints](#5-health-check-endpoints)
6. [Metrics & Monitoring](#6-metrics--monitoring)
7. [Azure Log Analytics](#7-azure-log-analytics)
8. [Alerting](#8-alerting)
9. [Debugging Guide](#9-debugging-guide)
10. [Support Operations](#10-support-operations)
11. [Performance Tuning](#11-performance-tuning)

---

## 1. Observability Overview

HiveCFM implements a multi-layered observability strategy spanning structured logging, error tracking, metrics collection, health monitoring, and audit trails. Every layer operates independently so that failure in one system does not compromise the others.

### Architecture Diagram

```mermaid
graph TB
    subgraph "HiveCFM Application"
        APP[Next.js Application]
        MW[Middleware<br/>x-request-id, x-start-time]
        V1[V1 API Wrapper<br/>withV1ApiWrapper]
        V2[V2 API Handlers<br/>logApiRequest / logApiError]
        EB[Error Boundary<br/>app/error.tsx]
    end

    subgraph "Logging Layer"
        PINO[Pino Logger<br/>@hivecfm/logger]
        AUDIT[Audit Log Service<br/>Custom level: 90]
        HELPERS[Logger Helpers<br/>redactPII / deepDiff]
    end

    subgraph "Error Tracking"
        SENTRY_SERVER[Sentry Server SDK<br/>sentry.server.config.ts]
        SENTRY_EDGE[Sentry Edge SDK<br/>sentry.edge.config.ts]
        SENTRY_CLIENT[Sentry Client SDK<br/>SentryProvider.tsx]
        REPLAY[Sentry Session Replay<br/>maskAllText / blockAllMedia]
    end

    subgraph "Metrics Layer"
        PROM[Prometheus Exporter<br/>Port 9464]
        OTEL[OpenTelemetry SDK<br/>instrumentation-node.ts]
        HOST[Host Metrics<br/>CPU, Memory, Disk]
        HTTP_INSTR[HTTP Instrumentation<br/>Request Metrics]
        RUNTIME[Runtime Node Instrumentation<br/>Event Loop, GC]
    end

    subgraph "Health Monitoring"
        HEALTH[/api/health<br/>Comprehensive Status/]
        READY[/api/ready<br/>Readiness Probe/]
        HEALTH_V2[/api/v2/health<br/>V2 Health Endpoint/]
    end

    subgraph "External Systems"
        STDOUT[Container stdout/stderr<br/>JSON Logs]
        SENTRY_CLOUD[Sentry Cloud<br/>Error Dashboard]
        PROM_SERVER[Prometheus Server<br/>Metric Scraping]
        AZURE_LA[Azure Log Analytics<br/>KQL Queries]
        K8S[Kubernetes<br/>Liveness / Readiness]
    end

    APP --> MW
    MW --> V1
    MW --> V2
    APP --> EB

    V1 --> PINO
    V2 --> PINO
    PINO --> AUDIT
    PINO --> HELPERS

    V1 --> SENTRY_SERVER
    V2 --> SENTRY_EDGE
    EB --> SENTRY_CLIENT
    SENTRY_CLIENT --> REPLAY

    APP --> OTEL
    OTEL --> PROM
    OTEL --> HOST
    OTEL --> HTTP_INSTR
    OTEL --> RUNTIME

    APP --> HEALTH
    APP --> READY
    APP --> HEALTH_V2

    PINO --> STDOUT
    STDOUT --> AZURE_LA
    SENTRY_SERVER --> SENTRY_CLOUD
    SENTRY_EDGE --> SENTRY_CLOUD
    SENTRY_CLIENT --> SENTRY_CLOUD
    PROM --> PROM_SERVER
    HEALTH --> K8S
    READY --> K8S
```

### Signal Types

| Signal | Tool | Purpose |
|--------|------|---------|
| Logs | Pino (JSON to stdout) | Structured application events, errors, debug info |
| Audit Logs | Pino custom level (90) | Compliance trail of user and API actions |
| Errors | Sentry | Exception tracking, stack traces, session replay |
| Metrics | OpenTelemetry + Prometheus | CPU, memory, HTTP request metrics, event loop stats |
| Health | Custom endpoints | Liveness/readiness probes for Kubernetes |

---

## 2. Structured Logging (Pino)

HiveCFM uses Pino v10 as its structured logging library, provided by the `@hivecfm/logger` package at `packages/logger/`.

### Logger Configuration

**Source file:** `packages/logger/src/logger.ts`

The logger is configured as a singleton with environment-aware defaults:

```
Production: JSON output to stdout (no formatting, machine-parseable)
Development: pino-pretty with colorized output, human-readable timestamps
Build phase: Only errors are logged to reduce noise
```

### Log Levels

HiveCFM defines custom log levels with `useOnlyCustomLevels: true`, meaning only these levels are available:

| Level | Numeric Value | When Used |
|-------|---------------|-----------|
| `debug` | 20 | Detailed diagnostic information: cache operations, rate limit checks, Redis connectivity |
| `info` | 30 | Significant application events: server startup, Redis connected, Sentry initialized |
| `warn` | 40 | Recoverable issues: corrupted cache data, telemetry failures, failed S3 operations |
| `error` | 50 | Operation failures: database errors, API handler exceptions, rate limit violations |
| `fatal` | 60 | Unrecoverable errors: uncaught exceptions, unhandled rejections |
| `audit` | 90 | Compliance audit trail: user actions, API mutations, authentication events |

### Default Log Level Selection

The logger determines its active level through a priority chain:

1. If `LOG_LEVEL` environment variable is set and valid, use that value.
2. If building (`NEXT_PHASE=phase-production-build`), default to `error`.
3. If production (`NODE_ENV=production`), default to `warn`.
4. Otherwise (development/test), default to `info`.

**Environment variable:** `LOG_LEVEL` -- accepts: `debug`, `info`, `warn`, `error`, `fatal`, `audit`

### Log Format

**Production (JSON):**

```json
{
  "level": "error",
  "time": 1710345600000,
  "name": "hivecfm",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "path": "/api/v1/management/surveys",
  "status": 500,
  "msg": "V1 API Error Details"
}
```

**Development (pino-pretty):**

```
ERROR [2026-03-13 10:30:00] V1 API Error Details
    correlationId: "a1b2c3d4-..."
    method: "POST"
    path: "/api/v1/management/surveys"
    status: 500
```

Development mode ignores `pid`, `hostname`, `ip`, and `requestId` fields for cleaner output.

### Standard Serializers

The logger includes Pino's built-in serializers for safe logging of complex objects:

- `err` -- Serializes Error objects with stack traces, preserving the cause chain
- `req` -- Serializes HTTP request objects (method, url, headers) while omitting bodies
- `res` -- Serializes HTTP response objects (statusCode, headers)

### Context-Enriched Logging

The logger exposes two context methods:

**`logger.withContext(context)`** -- Creates a child logger with additional fields attached to every log entry:

```typescript
logger.withContext({
  component: "health_check",
  check_type: "main_database",
  error,
}).error("Database health check failed");
```

**`logger.request(req)`** -- Creates a child logger pre-populated with HTTP method and URL:

```typescript
logger.request(req).info("Processing request");
// Output includes: { method: "GET", url: "https://..." }
```

### Process Lifecycle Handlers

When running in Node.js runtime (`NEXT_RUNTIME=nodejs`), the logger attaches handlers for:

- `uncaughtException` -- Logs the error at `error` level and flushes the log buffer
- `unhandledRejection` -- Logs the rejection at `error` level and flushes the log buffer
- `SIGTERM` -- Logs the shutdown event and flushes the buffer (graceful container termination)
- `SIGINT` -- Logs the shutdown event and flushes the buffer (manual interruption)

The `pinoLogger.flush()` call ensures all buffered log entries are written to stdout before process exit, preventing log loss during container shutdown.

### Log Rotation and Retention

HiveCFM writes all logs to `stdout`/`stderr` in the container. Log rotation and retention are handled at the infrastructure level:

- **Azure Container Apps:** Logs are automatically collected from container stdout and forwarded to Azure Log Analytics with configurable retention (default 30 days, configurable up to 730 days).
- **Kubernetes (Helm):** Container logs are collected by the cluster's logging stack (e.g., Fluentd, Promtail) and forwarded to the configured log aggregation system.
- **Docker Compose:** Docker manages log files with configurable rotation via logging driver options.

No file-based rotation is needed because the application never writes log files directly.

---

## 3. API Request Logging

HiveCFM has two API wrapper systems that handle logging, authentication, rate limiting, and audit trails for all API traffic.

### V1 API Wrapper (`withV1ApiWrapper`)

**Source file:** `apps/web/app/lib/api/with-api-logging.ts`

The V1 API wrapper provides a unified handler for all `/api/v1/` routes with these phases executed in order:

```mermaid
flowchart TD
    REQ[Incoming Request] --> RC[Route Classification]
    RC --> AUTH[Authentication]
    AUTH --> AUDIT_SETUP[Audit Log Setup]
    AUDIT_SETUP --> RL[Rate Limiting]
    RL --> HANDLER[Handler Execution]
    HANDLER --> RESP[Response Processing]
    RESP --> LOG{Response OK?}
    LOG -->|Yes| AUDIT_SUCCESS[Set audit status = success]
    LOG -->|No| ERROR_LOG[Log Error Details<br/>+ Sentry if 500+]
    AUDIT_SUCCESS --> QUEUE[Queue Audit Event]
    ERROR_LOG --> QUEUE
    QUEUE --> RETURN[Return Response]
```

#### Route Classification

Routes are classified into three categories based on URL pattern matching:

| Route Type | URL Pattern | Authentication | Rate Limiting |
|-----------|-------------|----------------|---------------|
| **Client** | `/api/v{n}/client/*` | None (public) | IP-based, 100/min |
| **General (Management)** | `/api/v{n}/management/*`, `/api/v1/webhooks/*` | API Key (or Both for storage) | API-key-based, 100/min |
| **Integration** | `/api/v{n}/integrations/*` | Session | Session-based, 100/min |

Special cases:
- `/api/v1/client/og/*` routes are not rate limited (Open Graph image generation)
- `/api/v1/management/storage/*` accepts both API key and session authentication
- Sync user identification endpoints (`/api/v1/client/{envId}/app/sync/{userId}`) have a stricter rate limit of 5/minute per environment-user pair

#### Request Metadata Captured

The middleware (`apps/web/middleware.ts`) injects two headers into every request before it reaches API handlers:

| Header | Value | Purpose |
|--------|-------|---------|
| `x-request-id` | UUID v4 | Correlation ID for tracing requests across logs and Sentry |
| `x-start-time` | `Date.now()` | Timestamp for calculating request duration |

#### Error Logging (V1)

When a V1 API returns a non-OK response, `logErrorDetails` is called:

1. A structured log entry is written with: `correlationId`, `method`, `path`, `status`, and the error object.
2. If the response status is >= 500 **and** Sentry is configured **and** in production:
   - A Sentry scope is created with the `correlationId` as a tag
   - If the error is an `Error` instance, `Sentry.captureException(error)` is called for full stack trace
   - Otherwise, a synthetic error is created with the correlation ID for traceability

### V2 API Logging

**Source files:** `apps/web/modules/api/v2/lib/utils.ts`, `apps/web/modules/api/v2/lib/utils-edge.ts`

The V2 API system provides two logging functions:

**`logApiRequest`** -- Called for successful responses. Logs:
- HTTP method, path, response status
- Duration (calculated from `x-start-time`)
- Correlation ID (from `x-request-id`)
- Query parameters (with sensitive params like `apikey`, `token`, `secret` filtered out)

**`logApiError` / `logApiErrorEdge`** -- Called for error responses. The edge-compatible version:
- Only sends to Sentry if the error type is `internal_server_error` (prevents flooding Sentry with 4xx errors)
- Tags the Sentry event with `correlationId` for easy filtering
- Always writes a structured log entry regardless of Sentry configuration

### Rate Limit Configurations

**Source file:** `apps/web/modules/core/rate-limit/rate-limit-configs.ts`

All rate limits are enforced atomically via Redis Lua scripts to prevent race conditions in multi-pod deployments:

| Category | Endpoint | Limit | Window |
|----------|----------|-------|--------|
| Auth: Login | `/auth/login` | 10 requests | 15 minutes |
| Auth: Signup | `/auth/signup` | 30 requests | 1 hour |
| Auth: Forgot Password | `/auth/forgot-password` | 5 requests | 1 hour |
| Auth: Verify Email | `/auth/verify-email` | 10 requests | 1 hour |
| API: V1 Management | `/api/v1/management/*` | 100 requests | 1 minute |
| API: V2 | `/api/v2/*` | 100 requests | 1 minute |
| API: Client | `/api/v{n}/client/*` | 100 requests | 1 minute |
| API: Sync User ID | `/api/v1/client/{env}/app/sync/{user}` | 5 requests | 1 minute |
| Action: Email Update | Server actions | 3 requests | 1 hour |
| Action: Follow Up | Server actions | 50 requests | 1 hour |
| Action: Link Survey Email | Server actions | 10 requests | 1 hour |
| Storage: Upload | Upload endpoints | 5 requests | 1 minute |
| Storage: Delete | Delete endpoints | 5 requests | 1 minute |

**Fail-open policy:** If Redis is unavailable, rate limiting is skipped and the request is allowed through. This prioritizes availability over strict rate enforcement.

Rate limit violations are logged at `error` level with full context (identifier, current count, limit, window, namespace) and added as Sentry breadcrumbs.

---

## 4. Sentry Error Tracking

HiveCFM uses Sentry (`@sentry/nextjs`) for error tracking across three runtime environments: server, edge, and client (browser).

### Configuration Files

| File | Runtime | When Loaded |
|------|---------|-------------|
| `apps/web/sentry.server.config.ts` | Node.js server | Production only, when `SENTRY_DSN` is set |
| `apps/web/sentry.edge.config.ts` | Edge runtime | Production only, when `SENTRY_DSN` is set |
| `apps/web/app/sentry/SentryProvider.tsx` | Client (browser) | Production only, when `SENTRY_DSN` is set |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | No | Data Source Name -- the URL for sending events to Sentry. If not set, Sentry is completely disabled. |
| `SENTRY_ENVIRONMENT` | No | Environment tag (e.g., `production`, `staging`). Sent with every event for filtering. |
| `SENTRY_AUTH_TOKEN` | No | Build-time token for uploading source maps. If not set, source map upload is skipped. |

### Initialization Flow

```mermaid
flowchart TD
    START[Application Start] --> INSTR[instrumentation.ts<br/>register]
    INSTR --> CHECK_RUNTIME{NEXT_RUNTIME?}
    CHECK_RUNTIME -->|nodejs| CHECK_PROD_NODE{IS_PRODUCTION<br/>&&<br/>SENTRY_DSN?}
    CHECK_PROD_NODE -->|Yes| LOAD_SERVER[Import sentry.server.config.ts<br/>Initialize Sentry Server SDK]
    CHECK_PROD_NODE -->|No| SKIP_NODE[Sentry disabled on server]
    CHECK_RUNTIME -->|edge| CHECK_PROD_EDGE{IS_PRODUCTION<br/>&&<br/>SENTRY_DSN?}
    CHECK_PROD_EDGE -->|Yes| LOAD_EDGE[Import sentry.edge.config.ts<br/>Initialize Sentry Edge SDK]
    CHECK_PROD_EDGE -->|No| SKIP_EDGE[Sentry disabled on edge]

    LAYOUT[Root Layout renders] --> PROVIDER[SentryProvider<br/>Client-side init]
    PROVIDER --> CHECK_CLIENT{sentryDsn &&<br/>isEnabled?}
    CHECK_CLIENT -->|Yes| INIT_CLIENT[Sentry.init in useEffect<br/>+ Session Replay]
    CHECK_CLIENT -->|No| SKIP_CLIENT[Sentry disabled in browser]
```

### Server SDK Configuration

- **Tracing:** Disabled (`tracesSampleRate: 0`) due to compatibility issues with OpenTelemetry 2.0.0
- **PII:** `sendDefaultPii: false` -- no automatic PII collection
- **Client reports:** Disabled to reduce noise
- **Event filtering:** `NEXT_NOT_FOUND` errors are dropped (common 404s, not actionable)
- **Request error capture:** `onRequestError = Sentry.captureRequestError` (from `instrumentation.ts`)

### Client SDK Configuration (Browser)

- **Session Replay:** Enabled with `maskAllText: true` and `blockAllMedia: true` for privacy
- **Replay sample rates:** 10% of normal sessions, 100% of sessions with errors
- **Event filtering:** Same `NEXT_NOT_FOUND` filter as server

### Error Boundary

**Source file:** `apps/web/app/error.tsx`

The global error boundary component:

1. In development: logs errors to the console
2. In production: calls `Sentry.captureException(error)` to send to Sentry
3. Distinguishes between rate limit errors and generic errors for user-facing messages
4. Provides "Try Again" and "Go to Dashboard" recovery buttons

### Custom Error Context

HiveCFM enriches Sentry events with custom context in several places:

- **Correlation ID:** Set as a tag (`correlationId`) on API errors for cross-referencing with logs
- **Error level:** Set to `error` for API 500+ responses
- **Rate limit breadcrumbs:** Rate limit violations are added as Sentry breadcrumbs with full context (identifier, current count, limit, window, namespace)
- **Original error:** When the error is not an `Error` instance, the original object is attached as `extra.originalError`

### Source Maps

**Configuration in `apps/web/next.config.mjs`:**

```javascript
const sentryOptions = {
  project: "hivecfm",
  org: "hivecfm",
  silent: false,
  widenClientFileUpload: true,  // Upload wider set of source maps
  disableLogger: false,         // Keep Sentry logger statements
};
```

- Production browser source maps are enabled: `productionBrowserSourceMaps: true`
- Source map upload only occurs when `SENTRY_AUTH_TOKEN` is set at build time
- The Sentry webpack plugin always runs to inject Debug IDs into bundles, regardless of whether upload is configured

### Release Tracking

The Sentry release version is derived from `package.json` at build time:

1. Reads the `version` field from `apps/web/package.json`
2. If the version is `0.0.0` (development placeholder), release tracking is disabled
3. Falls back to `undefined` if `package.json` cannot be read

This allows filtering Sentry events by release version to track regressions across deployments.

---

## 5. Health Check Endpoints

HiveCFM exposes three health check endpoints for infrastructure monitoring and container orchestration.

### Endpoint Overview

| Endpoint | Purpose | Checks | Response Format |
|----------|---------|--------|-----------------|
| `GET /api/health` | Comprehensive health status | Database + Redis | `{ success, data: { status, checks, timestamp } }` |
| `GET /api/ready` | Kubernetes readiness probe | Database + Redis | `{ ready: true/false, reason?: "..." }` |
| `GET /api/v2/health` | V2 API health (OpenAPI-compatible) | Database + Redis | Standard V2 response format |

### Health Check Implementation

**Source file:** `apps/web/modules/api/v2/health/lib/health-checks.ts`

All three endpoints share the same underlying `performHealthChecks()` function which runs two checks in parallel:

#### Database Health Check (`checkDatabaseHealth`)

```sql
SELECT 1
```

Executes a trivial query against PostgreSQL via Prisma. If the query succeeds within the connection timeout, the database is considered healthy. Failures are logged with context:

```json
{
  "component": "health_check",
  "check_type": "main_database",
  "error": "<error details>"
}
```

#### Cache Health Check (`checkCacheHealth`)

1. Obtains the Redis `CacheService` singleton
2. Calls `isRedisAvailable()` which sends a `PING` to Redis with a 1-second timeout
3. Returns `true` if Redis responds to PING

### Response Codes

**`/api/health`:**

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Both database and cache healthy | `{ success: true, data: { status: "healthy", checks: { database: true, cache: true }, timestamp } }` |
| 503 | Either database or cache unhealthy | `{ success: false, data: { status: "unhealthy", checks: { database: bool, cache: bool }, timestamp } }` |

**`/api/ready`:**

| Status | Condition | Body |
|--------|-----------|------|
| 200 | All systems ready | `{ ready: true }` |
| 503 | Database unavailable | `{ ready: false, reason: "database unavailable" }` |
| 503 | Cache unavailable | `{ ready: false, reason: "cache unavailable" }` |
| 503 | Both unavailable | `{ ready: false, reason: "database and cache unavailable" }` |

### Kubernetes Probe Configuration

The Helm chart (`helm-chart/values.yaml`) configures three probes:

```yaml
startupProbe:
  failureThreshold: 30    # Allow up to 5 minutes for initial startup
  periodSeconds: 10
  tcpSocket:
    port: 3000

readinessProbe:
  failureThreshold: 5
  periodSeconds: 10
  successThreshold: 1
  timeoutSeconds: 5
  initialDelaySeconds: 10
  httpGet:
    path: /health
    port: 3000

livenessProbe:
  failureThreshold: 5
  periodSeconds: 10
  successThreshold: 1
  timeoutSeconds: 5
  initialDelaySeconds: 10
  httpGet:
    path: /health
    port: 3000
```

**Startup probe** uses TCP socket check (not HTTP) because the application may not be serving HTTP during initial database migrations. The 30-failure threshold with 10-second intervals provides up to 5 minutes for startup.

**Readiness and liveness probes** both hit `/api/health` which validates database and Redis connectivity. A pod is removed from the service endpoint if it fails 5 consecutive readiness checks, and restarted after 5 consecutive liveness failures.

---

## 6. Metrics & Monitoring

### Prometheus Metrics

**Source file:** `apps/web/instrumentation-node.ts`

When `PROMETHEUS_ENABLED=1`, HiveCFM starts an OpenTelemetry-based Prometheus exporter:

#### Configuration

| Setting | Value | Environment Variable |
|---------|-------|---------------------|
| Exporter port | 9464 (default) | `PROMETHEUS_EXPORTER_PORT` |
| Endpoint path | `/metrics` | Hardcoded |
| Bind address | `0.0.0.0` | Hardcoded (all interfaces) |
| Scrape interval | 5 seconds | Configured in ServiceMonitor |

#### Instrumentation Stack

The metrics pipeline uses these OpenTelemetry components:

1. **PrometheusExporter** -- Exposes metrics in Prometheus exposition format
2. **HostMetrics** -- Collects system-level metrics:
   - CPU usage (user, system, idle, iowait)
   - Memory usage (used, free, cached, buffered)
   - Network I/O (bytes sent/received, packets, errors)
   - Disk I/O (read/write bytes, operations)
3. **HttpInstrumentation** -- Collects HTTP request metrics:
   - Request count by method, status code, and route
   - Request duration histograms
   - Active request count
4. **RuntimeNodeInstrumentation** -- Collects Node.js runtime metrics:
   - Event loop lag (min, max, mean, p99)
   - Garbage collection duration and frequency
   - Active handles and requests
   - Heap memory usage (used, total, external)

#### Resource Detection

The exporter automatically detects and attaches resource attributes:

- **Environment detector:** Reads `OTEL_RESOURCE_ATTRIBUTES` env var
- **Process detector:** PID, executable name, command, runtime version
- **Host detector:** Hostname, OS type, architecture

#### Graceful Shutdown

The metrics provider registers a `SIGTERM` handler that:
1. Calls `meterProvider.shutdown()` to flush final metrics
2. Exits the process cleanly

### Kubernetes ServiceMonitor

**Source file:** `helm-chart/templates/servicemonitor.yaml`

The Helm chart includes a `ServiceMonitor` resource (requires `monitoring.coreos.com/v1` CRD):

```yaml
spec:
  endpoints:
    - interval: 5s
      path: /metrics
      port: metrics    # Maps to container port 9464
```

This tells the Prometheus Operator to scrape the `/metrics` endpoint on port 9464 every 5 seconds from all pods matching the HiveCFM label selectors.

### Horizontal Pod Autoscaler

The Helm chart configures HPA with resource-based metrics:

| Metric | Target | Min Replicas | Max Replicas |
|--------|--------|--------------|--------------|
| CPU Utilization | 60% | 1 | 10 |
| Memory Utilization | 60% | 1 | 10 |

### Recommended Dashboards

For a Grafana deployment monitoring HiveCFM, these panels are recommended:

**Application Health:**
- Request rate (requests/second) by status code
- Error rate (5xx responses as percentage of total)
- P50/P95/P99 response latency
- Active connections count

**Infrastructure:**
- CPU utilization per pod
- Memory usage vs. limits (warning threshold at 80% of 2Gi limit)
- Network I/O per pod
- Disk I/O (relevant for PostgreSQL persistent volumes)

**Node.js Runtime:**
- Event loop lag (P99 should stay under 100ms)
- Garbage collection pause time
- Heap memory growth over time
- Active handles (watch for handle leaks)

**Redis:**
- Connected clients
- Memory usage
- Cache hit/miss ratio
- Operations per second

**PostgreSQL:**
- Active connections vs. pool size
- Query duration percentiles
- Transaction rate
- Deadlock count

---

## 7. Azure Log Analytics

HiveCFM runs on Azure Container Apps, which automatically forwards container stdout/stderr to Azure Log Analytics. Since Pino outputs structured JSON in production, all log fields are queryable via KQL (Kusto Query Language).

### Accessing Logs

1. Navigate to the Azure Portal
2. Open the Container Apps Environment resource
3. Go to **Monitoring > Logs**
4. Select the `ContainerAppConsoleLogs_CL` table

### Common KQL Queries

#### Find All Errors in the Last Hour

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Level = LogJson.level, Message = LogJson.msg,
          CorrelationId = LogJson.correlationId, Method = LogJson.method,
          Path = LogJson.path, Status = LogJson.status
| order by TimeGenerated desc
```

#### Track a Specific Request by Correlation ID

```kql
ContainerAppConsoleLogs_CL
| where Log_s contains "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Level = LogJson.level, Message = LogJson.msg
| order by TimeGenerated asc
```

#### Rate Limit Violations

```kql
ContainerAppConsoleLogs_CL
| where Log_s contains "Rate limit exceeded"
| extend LogJson = parse_json(Log_s)
| project TimeGenerated,
          Identifier = LogJson.identifier,
          Namespace = LogJson.namespace,
          CurrentCount = LogJson.currentCount,
          Limit = LogJson.limit,
          Window = LogJson.window
| order by TimeGenerated desc
```

#### API Error Rate by Path (Last 24 Hours)

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| where isnotempty(LogJson.path)
| summarize ErrorCount = count() by Path = tostring(LogJson.path)
| order by ErrorCount desc
| take 20
```

#### Audit Log Events

```kql
ContainerAppConsoleLogs_CL
| where Log_s contains '"level":"audit"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated,
          Action = LogJson.action,
          TargetType = LogJson.target.type,
          TargetId = LogJson.target.id,
          ActorId = LogJson.actor.id,
          ActorType = LogJson.actor.type,
          Status = LogJson.status,
          OrgId = LogJson.organizationId
| order by TimeGenerated desc
```

#### Health Check Failures

```kql
ContainerAppConsoleLogs_CL
| where Log_s contains "health_check"
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated,
          CheckType = LogJson.check_type,
          Component = LogJson.component,
          Message = LogJson.msg
| order by TimeGenerated desc
```

#### Redis Connection Issues

```kql
ContainerAppConsoleLogs_CL
| where Log_s contains "Redis"
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Level = LogJson.level, Message = LogJson.msg
| order by TimeGenerated desc
```

### Container Apps Log Stream

For real-time debugging, use the Azure Portal's **Log stream** feature:

1. Navigate to the specific Container App
2. Go to **Monitoring > Log stream**
3. Select the revision and replica to stream

Alternatively, use the Azure CLI:

```bash
az containerapp logs show \
  --name hivecfm-app \
  --resource-group hivecfm-rg \
  --type console \
  --follow
```

### Diagnostic Settings

For long-term log retention or forwarding to external SIEM systems, configure Diagnostic Settings on the Container Apps Environment:

1. Go to the Container Apps Environment > **Diagnostic settings**
2. Add a diagnostic setting with:
   - **Category:** `ContainerAppConsoleLogs`, `ContainerAppSystemLogs`
   - **Destination:** Log Analytics Workspace, Storage Account, or Event Hub
3. Set retention period as needed (up to 730 days for Log Analytics)

---

## 8. Alerting

HiveCFM does not include built-in alerting rules, but the observability data it produces enables comprehensive alerting through external systems (Azure Monitor, Prometheus Alertmanager, Grafana).

### Recommended Alert Rules

#### Error Rate Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | > 5% of requests return 5xx in 5-minute window | Critical | Page on-call engineer |
| Elevated Error Rate | > 1% of requests return 5xx in 15-minute window | Warning | Create incident ticket |
| Sentry Spike | > 50 new Sentry events in 5 minutes | Warning | Investigate in Sentry dashboard |

**Azure Monitor KQL Alert:**

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(5m)
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| where toint(LogJson.status) >= 500
| summarize ErrorCount = count()
| where ErrorCount > 50
```

#### Response Time Degradation

| Alert | Condition | Severity |
|-------|-----------|----------|
| Slow Responses (P95) | P95 latency > 2 seconds for 5 minutes | Warning |
| Very Slow Responses (P99) | P99 latency > 5 seconds for 5 minutes | Critical |
| Health Check Timeout | `/api/health` response time > 5 seconds | Critical |

**Prometheus alert rule (if using Alertmanager):**

```yaml
groups:
  - name: hivecfm-latency
    rules:
      - alert: HighP95Latency
        expr: histogram_quantile(0.95, rate(http_server_duration_milliseconds_bucket[5m])) > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency exceeds 2 seconds"
```

#### Database Connection Pool Exhaustion

| Alert | Condition | Severity |
|-------|-----------|----------|
| Pool Near Capacity | Active connections > 80% of pool size | Warning |
| Pool Exhausted | Health check returns `database: false` | Critical |
| Slow Queries | Database query duration P95 > 1 second | Warning |

**Azure Monitor KQL Alert for database health failures:**

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(5m)
| where Log_s contains "Database health check failed"
| summarize FailureCount = count()
| where FailureCount > 0
```

#### Memory and CPU Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Memory Pressure | Memory usage > 80% of 2Gi limit | Warning |
| Memory Critical | Memory usage > 90% of 2Gi limit | Critical |
| CPU Throttling | CPU utilization > 80% sustained for 10 min | Warning |
| OOMKill | Container restart with OOMKilled reason | Critical |

#### Redis Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Redis Unavailable | Health check returns `cache: false` | Critical |
| Redis Connection Error | Log contains "Redis client error" | Warning |
| Redis Reconnection | Log contains "Redis client connected" after error | Info |

#### Rate Limiting Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| Auth Brute Force | > 20 rate limit violations on `auth:login` in 15 min | Critical |
| API Abuse | > 100 rate limit violations on any namespace in 5 min | Warning |

---

## 9. Debugging Guide

### Common Issues and Diagnosis

#### Survey Not Appearing

**Symptoms:** End users report surveys are not showing, or survey triggers seem to fire but nothing renders.

**Diagnostic steps:**

1. **Check survey status:** Verify the survey is in `inProgress` status in the database:

```sql
SELECT id, name, status, "type", "displayOption"
FROM "Survey"
WHERE id = '<survey_id>';
```

2. **Verify environment:** Confirm the survey's project is associated with the correct environment (production vs. development):

```sql
SELECT s.id, s.name, e.type as env_type, p.name as project_name
FROM "Survey" s
JOIN "Environment" e ON s."environmentId" = e.id
JOIN "Project" p ON e."projectId" = p.id
WHERE s.id = '<survey_id>';
```

3. **Check triggers:** Look at the action classes and triggers associated with the survey:

```sql
SELECT st."surveyId", ac.name, ac.type, ac."noCodeConfig"
FROM "SurveyTrigger" st
JOIN "ActionClass" ac ON st."actionClassId" = ac.id
WHERE st."surveyId" = '<survey_id>';
```

4. **Check display limits:** If the survey has a `displayLimit` or `displayPercentage`, the client SDK may intentionally skip it:

```sql
SELECT id, "displayLimit", "displayPercentage"
FROM "Survey"
WHERE id = '<survey_id>';
```

5. **Client-side logs:** Enable debug logging in the JS SDK by setting `debug: true` in the initialization. Look for messages like:
   - `"Survey display of X skipped based on displayPercentage"`
   - `"A survey is already running. Skipping."`
   - `"Survey X is not available in specified language"`

6. **Check segment conditions:** If the survey targets a specific segment, verify the contact matches:

```sql
SELECT s.id, s.title, s.filters
FROM "Segment" s
JOIN "Survey" sv ON sv."segmentId" = s.id
WHERE sv.id = '<survey_id>';
```

#### Response Not Recording

**Symptoms:** Users submit survey responses but data does not appear in the dashboard.

**Diagnostic steps:**

1. **Check the client API logs** for errors on the response submission endpoint:

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains "/api/v1/client"
| where Log_s contains "response"
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Path = LogJson.path, Status = LogJson.status,
          CorrelationId = LogJson.correlationId
```

2. **Check rate limiting:** The client API has a 100 req/min limit per IP. High-traffic survey deployments may hit this:

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains "Rate limit exceeded"
| where Log_s contains "api:client"
```

3. **Verify the response was stored:**

```sql
SELECT id, "surveyId", "contactId", finished, "created_at"
FROM "Response"
WHERE "surveyId" = '<survey_id>'
ORDER BY "created_at" DESC
LIMIT 10;
```

4. **Check for webhook delivery failures** if integrations are supposed to process responses:

```sql
SELECT id, "surveyId", url, source, "created_at"
FROM "Webhook"
WHERE "surveyId" = '<survey_id>';
```

#### Integration Failures (Webhooks, Superset, etc.)

**Diagnostic steps:**

1. **Check integration configuration:**

```sql
SELECT id, type, config, "projectId"
FROM "Integration"
WHERE "projectId" = '<project_id>';
```

2. **Search for integration errors in logs:**

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "integration" or Log_s contains "webhook"
| where Log_s contains '"level":"error"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Message = LogJson.msg, Error = LogJson.error
| order by TimeGenerated desc
```

3. **Verify webhook endpoint connectivity:** From the HiveCFM pod or container, test the webhook URL:

```bash
curl -v -X POST <webhook_url> -H "Content-Type: application/json" -d '{}'
```

4. **Check Slack integration:** Verify the Slack OAuth token is still valid and the bot has access to the target channel.

5. **Check Google Sheets integration:** Verify the OAuth refresh token has not expired and the sheet still exists.

#### Authentication Errors

**Diagnostic steps:**

1. **Check NextAuth logs:**

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains "auth" or Log_s contains "session"
| where Log_s contains '"level":"error"' or Log_s contains '"level":"warn"'
| extend LogJson = parse_json(Log_s)
| project TimeGenerated, Level = LogJson.level, Message = LogJson.msg
```

2. **Verify NEXTAUTH_URL matches WEBAPP_URL:** A mismatch causes CSRF validation failures.

3. **Check NEXTAUTH_SECRET:** Ensure it has not changed between deployments. Changing the secret invalidates all existing sessions.

4. **For SSO failures:** Check the specific provider configuration:

```sql
SELECT id, provider, type, "providerAccountId"
FROM "Account"
WHERE "userId" = '<user_id>';
```

5. **For API key authentication failures:**

```sql
SELECT ak.id, ak.label, ak."hashedKey", ak."expiresAt",
       e.type as env_type
FROM "ApiKey" ak
JOIN "Environment" e ON ak."environmentId" = e.id
WHERE ak.id = '<api_key_id>';
```

Check if `expiresAt` has passed.

6. **Rate limiting on auth endpoints:** Login is limited to 10 attempts per 15 minutes. Check:

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains "Rate limit exceeded"
| where Log_s contains "auth:login"
```

#### Rate Limiting Issues

**Symptoms:** Users receive 429 Too Many Requests errors.

**Diagnostic steps:**

1. **Identify which rate limit is being hit:**

```kql
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(1h)
| where Log_s contains "Rate limit exceeded"
| extend LogJson = parse_json(Log_s)
| summarize Count = count() by Namespace = tostring(LogJson.namespace),
            Identifier = tostring(LogJson.identifier)
| order by Count desc
```

2. **Check if rate limiting is using Redis or is disabled:**
   - If `RATE_LIMITING_DISABLED=1`, no rate limiting occurs
   - If Redis is unavailable, rate limiting fails open (all requests allowed)

3. **For legitimate high-traffic scenarios,** consider increasing the rate limit by passing a `customRateLimitConfig` to the API wrapper.

---

## 10. Support Operations

### Audit Logging System

HiveCFM includes an enterprise audit logging system that records all significant user and API actions.

**Source files:**
- `apps/web/modules/ee/audit-logs/lib/handler.ts` -- Event building and queueing
- `apps/web/modules/ee/audit-logs/lib/service.ts` -- Event validation and writing
- `apps/web/modules/ee/audit-logs/types/audit-log.ts` -- Type definitions

#### Enabling Audit Logs

Set `AUDIT_LOG_ENABLED=1` in environment variables. Optionally set `AUDIT_LOG_GET_USER_IP=1` to capture client IP addresses (privacy implications apply).

#### Audit Event Structure

```json
{
  "actor": { "id": "user_abc123", "type": "user" },
  "action": "updated",
  "target": { "id": "survey_xyz789", "type": "survey" },
  "status": "success",
  "timestamp": "2026-03-13T10:30:00.000Z",
  "organizationId": "org_def456",
  "ipAddress": "unknown",
  "changes": {
    "name": "Updated Survey Name",
    "status": "inProgress"
  }
}
```

#### PII Redaction

**Source file:** `apps/web/lib/utils/logger-helpers.ts`

Before audit events are logged, sensitive fields are automatically redacted. The following keys are replaced with `"********"`:

`email`, `name`, `password`, `access_token`, `refresh_token`, `id_token`, `twofactorsecret`, `backupcodes`, `session_state`, `provideraccountid`, `imageurl`, `token`, `key`, `secret`, `code`, `address`, `phone`, `hashedkey`, `apikey`, `createdby`, `firstname`, `lastname`, `userid`, `attributes`, `pin`, `image`, `stripeCustomerId`, `fileName`, `state`

URLs in audit data have sensitive query parameters (`token`, `code`, `state`) redacted.

#### Audited Target Types

The system tracks 23 target types: `segment`, `survey`, `webhook`, `user`, `contactAttributeKey`, `projectTeam`, `team`, `actionClass`, `response`, `contact`, `organization`, `tag`, `project`, `language`, `invite`, `membership`, `twoFactorAuth`, `apiKey`, `integration`, `file`, `quota`, `tenant`, `tenantQuota`, `tenantBranding`, `tenantLicense`, `workflow`, `channel`.

#### Audited Actions

22 action types: `created`, `updated`, `deleted`, `signedIn`, `merged`, `verificationEmailSent`, `createdFromCSV`, `copiedToOtherEnvironment`, `addedToResponse`, `removedFromResponse`, `createdUpdated`, `subscriptionAccessed`, `subscriptionUpdated`, `twoFactorVerified`, `emailVerified`, `jwtTokenCreated`, `authenticationAttempted`, `authenticationSucceeded`, `passwordVerified`, `twoFactorAttempted`, `twoFactorRequired`, `emailVerificationAttempted`, `userSignedOut`, `passwordReset`, `bulkCreated`, `accessed`.

### Incident Response Procedures

```mermaid
flowchart TD
    DETECT[Incident Detected<br/>Alert / User Report / Monitoring] --> ASSESS{Severity?}

    ASSESS -->|Critical<br/>Service Down| SEV1[SEV-1: Full Outage]
    ASSESS -->|High<br/>Major Feature Broken| SEV2[SEV-2: Degraded Service]
    ASSESS -->|Medium<br/>Minor Feature Issue| SEV3[SEV-3: Minor Impact]
    ASSESS -->|Low<br/>Cosmetic / Non-urgent| SEV4[SEV-4: Low Priority]

    SEV1 --> TRIAGE1[Immediate Triage<br/>1. Check health endpoints<br/>2. Check Azure Container Apps status<br/>3. Check database connectivity]
    SEV2 --> TRIAGE2[Priority Triage<br/>1. Check error logs in last 30 min<br/>2. Check Sentry for new issues<br/>3. Check recent deployments]
    SEV3 --> TRIAGE3[Standard Triage<br/>1. Gather reproduction steps<br/>2. Search logs for correlation ID<br/>3. Check known issues]
    SEV4 --> BACKLOG[Add to Backlog]

    TRIAGE1 --> MITIGATE[Mitigation]
    TRIAGE2 --> MITIGATE
    TRIAGE3 --> INVESTIGATE[Investigate & Fix]

    MITIGATE --> SCALE{Scale Issue?}
    SCALE -->|Infrastructure| INFRA[1. Scale up pods<br/>2. Restart unhealthy pods<br/>3. Check resource limits]
    SCALE -->|Database| DB[1. Check connection pool<br/>2. Kill long-running queries<br/>3. Check disk space]
    SCALE -->|Application| APP_FIX[1. Rollback deployment<br/>2. Toggle feature flags<br/>3. Disable problematic integration]
    SCALE -->|External| EXT[1. Check external service status<br/>2. Enable circuit breaker<br/>3. Notify users of degradation]

    INFRA --> RESOLVE[Resolve & Document]
    DB --> RESOLVE
    APP_FIX --> RESOLVE
    EXT --> RESOLVE
    INVESTIGATE --> RESOLVE

    RESOLVE --> POSTMORTEM[Post-Mortem<br/>Root cause analysis<br/>Action items<br/>Monitoring improvements]
```

### Common Support Scenarios

#### User Cannot Log In

1. Check if the user exists:

```sql
SELECT id, email, "emailVerified", role
FROM "User"
WHERE email = 'user@example.com';
```

2. Check if the account is linked (for SSO):

```sql
SELECT a.provider, a.type
FROM "Account" a
JOIN "User" u ON a."userId" = u.id
WHERE u.email = 'user@example.com';
```

3. Check for rate limiting on the login endpoint (see Rate Limiting section).

4. Verify SMTP is configured if email verification is required.

#### User Cannot Access Organization

```sql
-- Check membership
SELECT m.role, m."accepted", o.name as org_name
FROM "Membership" m
JOIN "Organization" o ON m."organizationId" = o.id
JOIN "User" u ON m."userId" = u.id
WHERE u.email = 'user@example.com';
```

#### Reset User Password

With email auth enabled, direct the user to the "Forgot Password" flow. If SMTP is not configured:

```sql
-- Last resort: Update password hash directly (use bcrypt with 12 rounds)
-- Generate hash: node -e "require('bcryptjs').hash('newpassword', 12).then(console.log)"
UPDATE "User"
SET password = '<bcrypt_hash>'
WHERE email = 'user@example.com';
```

#### Survey Response Data Export

```sql
-- Get all responses for a survey with answer data
SELECT r.id, r.data, r.finished, r."created_at",
       r."contactId"
FROM "Response" r
WHERE r."surveyId" = '<survey_id>'
ORDER BY r."created_at" DESC;
```

#### Check Organization Quotas

```sql
SELECT o.id, o.name,
       (SELECT COUNT(*) FROM "Project" p
        JOIN "Environment" e ON e."projectId" = p.id
        WHERE e."organizationId" = o.id) as project_count,
       (SELECT COUNT(*) FROM "Response" r
        JOIN "Survey" s ON r."surveyId" = s.id
        JOIN "Environment" e ON s."environmentId" = e.id
        WHERE e."organizationId" = o.id) as total_responses
FROM "Organization" o
WHERE o.id = '<org_id>';
```

### Database Query Recipes for Support

#### Find Recent Failed Responses

```sql
SELECT r.id, r."surveyId", r."created_at", r.finished,
       s.name as survey_name
FROM "Response" r
JOIN "Survey" s ON r."surveyId" = s.id
WHERE r.finished = false
  AND r."created_at" > NOW() - INTERVAL '24 hours'
ORDER BY r."created_at" DESC
LIMIT 50;
```

#### List Active Surveys with Response Counts

```sql
SELECT s.id, s.name, s.type, s."created_at",
       COUNT(r.id) as response_count
FROM "Survey" s
LEFT JOIN "Response" r ON r."surveyId" = s.id
WHERE s.status = 'inProgress'
GROUP BY s.id, s.name, s.type, s."created_at"
ORDER BY response_count DESC;
```

#### Find Users with Multiple Organizations

```sql
SELECT u.id, u.email,
       COUNT(m."organizationId") as org_count,
       STRING_AGG(o.name, ', ') as organizations
FROM "User" u
JOIN "Membership" m ON m."userId" = u.id
JOIN "Organization" o ON m."organizationId" = o.id
GROUP BY u.id, u.email
HAVING COUNT(m."organizationId") > 1;
```

#### Check Webhook Delivery Status

```sql
SELECT w.id, w.url, w."surveyIds", w.source,
       w."created_at"
FROM "Webhook" w
WHERE w."environmentId" = '<env_id>';
```

### User Management Operations

#### Transfer Project Ownership

```sql
-- Step 1: Verify both users are in the same organization
SELECT m."userId", m.role, m."organizationId"
FROM "Membership" m
WHERE m."userId" IN ('<old_owner_id>', '<new_owner_id>')
  AND m."organizationId" = '<org_id>';

-- Step 2: Update the project if ownership is tracked at the team level
-- Projects in HiveCFM are managed through team membership rather than direct ownership
```

#### Deactivate a User

```sql
-- Remove all memberships (soft deactivation)
DELETE FROM "Membership"
WHERE "userId" = '<user_id>';

-- Or remove from specific organization
DELETE FROM "Membership"
WHERE "userId" = '<user_id>'
  AND "organizationId" = '<org_id>';
```

### Environment Troubleshooting

#### Verify Environment Configuration

Check that all required environment variables are set:

```bash
# In the running container
env | grep -E "DATABASE_URL|REDIS_URL|WEBAPP_URL|NEXTAUTH|ENCRYPTION_KEY" | \
  sed 's/=.*/=<set>/'
```

#### Test Database Connectivity

```bash
# From inside the container
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT 1 as ok\`.then(r => {
  console.log('DB OK:', r);
  process.exit(0);
}).catch(e => {
  console.error('DB FAIL:', e.message);
  process.exit(1);
});
"
```

#### Test Redis Connectivity

```bash
# From inside the container
node -e "
const { createClient } = require('redis');
const c = createClient({ url: process.env.REDIS_URL });
c.connect().then(() => c.ping()).then(r => {
  console.log('Redis OK:', r);
  process.exit(0);
}).catch(e => {
  console.error('Redis FAIL:', e.message);
  process.exit(1);
});
"
```

---

## 11. Performance Tuning

### Database Query Optimization

#### Prisma Configuration

**Source file:** `packages/database/src/client.ts`

The Prisma client is configured as a singleton to prevent connection pool exhaustion:

```typescript
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    ...(process.env.DEBUG === "1" && {
      log: ["query", "info"],
    }),
  });
};
```

- **Singleton pattern:** Uses `globalThis` to ensure only one Prisma client exists across all modules (critical in Next.js with hot module reloading in development)
- **Debug mode:** When `DEBUG=1`, Prisma logs all SQL queries and timing information -- useful for identifying slow queries but should never be enabled in production
- **Connection pool:** Prisma uses a default connection pool. The pool size is controlled by the `connection_limit` parameter in `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&connection_limit=20
```

#### Query Optimization Strategies

1. **Batch counts in single queries:** The telemetry system demonstrates this pattern -- instead of 13 separate `COUNT(*)` queries, all counts are combined into a single `SELECT` with subqueries. This reduces connection pool usage from 13 connections to 1.

2. **Use `Promise.all` for independent queries:** When multiple queries do not depend on each other, run them in parallel:

```typescript
const [databaseResult, cacheResult] = await Promise.all([
  checkDatabaseHealth(),
  checkCacheHealth()
]);
```

3. **Select only needed fields:** Use Prisma's `select` to avoid transferring unnecessary data:

```typescript
const integrations = await prisma.integration.findMany({
  select: { type: true },
  distinct: ["type"]
});
```

4. **Avoid N+1 queries:** Use Prisma's `include` for related data or batch queries with `$queryRaw` for complex aggregations.

### Redis Caching Strategy

**Source files:** `packages/cache/src/service.ts`, `packages/cache/src/client.ts`

#### Cache Service Architecture

The cache service operates as a singleton with fail-fast semantics:

- **Singleton:** Uses `globalThis` for cross-module sharing, with a module-level variable for fast access
- **Connection check:** Before every operation, `isRedisClientReady()` checks both `isReady` and `isOpen` flags
- **Operation timeout:** All Redis operations have a 1-second timeout to prevent hanging (configurable per operation)
- **JSON serialization:** All values are serialized to JSON on write and deserialized on read; `undefined` is normalized to `null`

#### Cache-Aside Pattern (`withCache`)

The recommended pattern for caching function results:

```typescript
// Attempts to read from cache first
// On cache miss, executes the function and caches the result
// On cache error, executes the function without caching (fail-open)
const result = await cacheService.withCache(
  () => expensiveQuery(),
  cacheKey,
  ttlMs
);
```

Key behaviors:
- **Cache miss:** Executes the function, caches result, returns it
- **Cache hit:** Returns cached value immediately (no function execution)
- **Cache error:** Logs at debug level, executes function, returns result without caching
- **Cached null:** Uses `EXISTS` check to distinguish between cache miss and intentionally cached null values
- **Corrupted data:** JSON parse failures are treated as cache misses and logged as warnings

#### Distributed Locking

The cache service provides `tryLock` for coordinating work across multiple pods:

```typescript
const acquired = await cacheService.tryLock(
  lockKey,
  "locked",
  60 * 1000  // 1 minute TTL
);
```

Uses Redis `SET NX PX` for atomic lock acquisition with automatic expiration to prevent deadlocks.

#### Connection Recovery

The Redis client handles connection failures through event listeners:

- `error` event: Resets the cache factory (destroys client, clears singleton) so the next call creates a fresh connection
- `connect` / `ready` / `end` events: Logged at info level for operational awareness
- **No automatic retry:** The system uses a fail-fast approach. Consumers that need the cache call `getCacheService()` which creates a new connection if the previous one failed.

### Next.js Performance Configuration

**Source file:** `apps/web/next.config.mjs`

#### Build Output

- `output: "standalone"` -- Creates a minimal production build that includes only the files needed for a production deployment. This significantly reduces container image size.

#### Image Optimization

```javascript
images: {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],  // Removed 3840 to avoid huge images
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ["image/webp"],          // WebP is faster to process
  minimumCacheTTL: 60,              // Cache optimized images for 60 seconds
}
```

The configuration removes 3840px from `deviceSizes` to prevent CPU-intensive processing of ultra-high-resolution images that could cause request timeouts.

#### Static Asset Caching

The `headers()` configuration implements a tiered caching strategy:

| Asset Type | `max-age` | `s-maxage` | Strategy |
|-----------|-----------|------------|----------|
| JavaScript bundles (`/js/*`) | 1 hour | 30 days | `stale-while-revalidate: 1h` |
| SVG icons/logos | 30 days | 1 year | `immutable` |
| Favicons | 30 days | 1 year | `immutable` |
| Image backgrounds | 1 day | 30 days | `stale-while-revalidate: 1d` |
| Videos / animated backgrounds | 7 days | 1 year | `immutable` |
| CSV templates | 1 hour | 1 day | `stale-while-revalidate: 1h` |
| Static assets (images, fonts, icons) | 1 year | 1 year | `immutable` |

#### Server External Packages

```javascript
serverExternalPackages: ["@aws-sdk", "@opentelemetry/instrumentation", "pino", "pino-pretty"]
```

These packages are excluded from the Next.js server bundle and loaded at runtime. This prevents bundling issues with native modules and reduces server bundle size.

#### Security Headers

All routes include:

- `X-Content-Type-Options: nosniff` -- Prevents MIME type sniffing
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` -- Enforces HTTPS for 2 years
- `Referrer-Policy: strict-origin-when-cross-origin` -- Controls referrer information
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` -- Disables unnecessary browser APIs

Non-survey routes additionally include:
- `X-Frame-Options: SAMEORIGIN` -- Prevents clickjacking
- `Content-Security-Policy` with `frame-ancestors 'self'`

Survey routes (`/s/*` and `/c/*`) allow embedding in iframes from any origin (`frame-ancestors *`) to support embedding surveys in customer websites.

### Connection Pooling

#### PostgreSQL Connection Pool

Prisma manages the connection pool automatically. Tune via `DATABASE_URL` query parameters:

| Parameter | Default | Recommendation |
|-----------|---------|---------------|
| `connection_limit` | 5 per Prisma instance | Set to `(max_connections - 10) / num_pods` |
| `pool_timeout` | 10 seconds | Increase to 30s for complex queries |
| `connect_timeout` | 5 seconds | Keep default unless network latency is high |

For Azure Database for PostgreSQL Flexible Server with 100 max connections and 3 pods:

```
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&connection_limit=25&pool_timeout=30
```

Reserve ~10 connections for administrative access and monitoring tools.

#### Redis Connection Management

The Redis client uses a single connection per singleton instance (not pooled). Configuration:

```javascript
const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 3000,  // 3-second connection timeout
  },
});
```

For high-throughput deployments, Redis handles multiplexing natively -- a single connection can handle thousands of concurrent operations via pipelining. Connection scaling is handled by running multiple pods, each with its own Redis connection.

### Resource Limits

The Helm chart defines recommended resource allocations:

```yaml
resources:
  limits:
    memory: 2Gi       # Hard limit -- OOMKill if exceeded
  requests:
    memory: 1Gi       # Guaranteed allocation for scheduling
    cpu: "1"           # 1 CPU core requested
```

**Tuning guidance:**

- **Memory:** Next.js applications with SSR typically require 512Mi-1Gi under moderate load. The 2Gi limit provides headroom for traffic spikes and complex report generation. Monitor heap usage via Prometheus `nodejs_heap_size_used_bytes`.
- **CPU:** 1 core handles approximately 100-200 concurrent requests depending on route complexity. Scale horizontally via HPA rather than increasing CPU limits.
- **Pod count:** Start with 2 replicas for high availability, scale up based on the HPA CPU/memory thresholds (60% utilization target).

---

## Appendix: Environment Variable Reference (Observability)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `warn` (prod), `info` (dev) | Application log level: `debug`, `info`, `warn`, `error`, `fatal`, `audit` |
| `DEBUG` | No | `0` | When `1`, enables Prisma query logging |
| `SENTRY_DSN` | No | (none) | Sentry Data Source Name for error tracking |
| `SENTRY_ENVIRONMENT` | No | (none) | Environment tag for Sentry events |
| `SENTRY_AUTH_TOKEN` | No | (none) | Build-time token for source map upload |
| `PROMETHEUS_ENABLED` | No | `0` | When `1`, enables Prometheus metrics exporter |
| `PROMETHEUS_EXPORTER_PORT` | No | `9464` | Port for the Prometheus metrics endpoint |
| `AUDIT_LOG_ENABLED` | No | `0` | When `1`, enables audit logging at level 90 |
| `AUDIT_LOG_GET_USER_IP` | No | `0` | When `1`, captures client IP addresses in audit logs |
| `RATE_LIMITING_DISABLED` | No | `0` | When `1`, disables all rate limiting (for testing only) |
| `REDIS_URL` | Yes | (none) | Redis connection URL for caching and rate limiting |
| `OPENTELEMETRY_LISTENER_URL` | No | (none) | OpenTelemetry collector endpoint (reserved for future use) |
