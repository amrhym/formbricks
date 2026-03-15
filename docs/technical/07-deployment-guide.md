# 07 - Deployment Guide

This document provides comprehensive deployment instructions for HiveCFM across all supported targets: Docker Compose (development and production), Azure Container Apps (primary cloud), Kubernetes/Helm, and OpenShift on-premises. It covers container image builds, CI/CD pipelines, reverse proxy configuration, environment variables, health checks, backup strategies, and SSL/TLS certificate management.

---

## Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [Docker Configuration](#2-docker-configuration)
3. [Docker Compose](#3-docker-compose)
4. [Azure Container Apps Deployment](#4-azure-container-apps-deployment)
5. [Azure CI/CD Pipeline](#5-azure-cicd-pipeline)
6. [Kubernetes / Helm Deployment](#6-kubernetes--helm-deployment)
7. [OpenShift On-Premises Deployment](#7-openshift-on-premises-deployment)
8. [Environment Variables](#8-environment-variables)
9. [Nginx Reverse Proxy](#9-nginx-reverse-proxy)
10. [Backup and Recovery](#10-backup-and-recovery)
11. [Health Checks](#11-health-checks)
12. [SSL/TLS Certificate Management](#12-ssltls-certificate-management)

---

## 1. Deployment Overview

HiveCFM supports four deployment models, each targeting a different operational context.

| Deployment Target | Use Case | Orchestration | Infrastructure |
|---|---|---|---|
| Docker Compose (dev) | Local development | Docker Engine | Developer workstation |
| Docker Compose (prod) | Self-hosted single-server | Docker Engine + nginx | VM or bare-metal |
| Azure Container Apps | Primary cloud production | Azure Container Apps | Azure PaaS |
| Kubernetes / Helm | Multi-cloud or managed K8s | Kubernetes | Any K8s cluster |
| OpenShift On-Premises | Enterprise on-prem | OpenShift | On-premises data center |

### Platform Architecture

All deployment models share the same core services:

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Web Browser"]
        API["API Consumers"]
        SDK["JS SDK / Surveys"]
    end

    subgraph "Edge / Ingress"
        LB["Load Balancer / Nginx"]
    end

    subgraph "Application Layer"
        Core["hivecfm-core<br/>Next.js (port 3000)"]
        LP["license-portal<br/>Next.js (port 3101)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL 17<br/>+ pgvector"]
        Redis["Valkey / Redis<br/>Cache & Rate Limiting"]
        S3["MinIO / Azure Blob<br/>Object Storage"]
    end

    subgraph "Analytics & Integrations"
        Superset["Apache Superset<br/>Embedded Analytics"]
        N8N["n8n<br/>Workflow Automation"]
        MockSF["Mock Salesforce<br/>CRM Simulation"]
    end

    Browser --> LB
    API --> LB
    SDK --> LB
    LB --> Core
    LB --> LP
    Core --> PG
    Core --> Redis
    Core --> S3
    Core --> Superset
    Core --> N8N
    Core --> MockSF
    Superset --> PG
    Superset --> Redis
```

---

## 2. Docker Configuration

### 2.1. hivecfm-core Dockerfile (`apps/web/Dockerfile`)

The primary application image uses a three-stage multi-stage build.

```mermaid
graph TD
    A["Stage 1: base<br/>node:22-alpine3.22"] --> B["Stage 2: installer<br/>Dependencies + Build"]
    B --> C["Stage 3: runner<br/>Production Image"]

    B1["pnpm install"] --> B2["Build database package"]
    B2 --> B3["Build web application"]
    B3 --> B4["Extract Prisma version"]

    C1["Copy standalone output"] --> C2["Copy static assets"]
    C2 --> C3["Copy Prisma client"]
    C3 --> C4["Copy RLS scripts"]
    C4 --> C5["Install prisma CLI"]
    C5 --> C6["Run next-start.sh"]
```

#### Stage 1: Base Image

```dockerfile
FROM node:22-alpine3.22 AS base
```

Alpine-based Node 22 provides a minimal footprint. All subsequent stages inherit from this base.

#### Stage 2: Installer (Build)

The installer stage handles dependency resolution and application compilation:

**Build arguments:**

| Build Arg | Default | Purpose |
|---|---|---|
| `NODE_OPTIONS` | `--max_old_space_size=8192` | Increase Node.js heap for large builds |
| `TARGETARCH` | (auto from Docker) | Multi-platform architecture selection |
| `BASE_PATH` | `""` | Optional sub-path deployment |
| `NEXT_PUBLIC_SUPERSET_BASE_URL` | `""` | Client-side Superset URL for embedding |

**System dependencies installed:**

```
cmake g++ gcc jq make openssl-dev python3
```

These are required for native Node.js addon compilation (e.g., `argon2`, `bcrypt`).

**Layer caching strategy:**

1. **Dependency layer** -- Copy only `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json`, `.npmrc`, `patches/`, vendor packages, and all workspace `package.json` files first. This layer is cached unless lockfile or package manifests change.
2. **pnpm store cache** -- BuildKit cache mount at `/root/.local/share/pnpm/store` persists the pnpm package store across builds.
3. **Source layer** -- Full source copy happens after dependency installation. Code changes do not invalidate the dependency layer.
4. **Build caches** -- Turbo cache (`/app/node_modules/.cache`) and Next.js cache (`/app/apps/web/.next/cache`) are preserved via BuildKit cache mounts.

**Build secrets handling:**

The build process uses Docker BuildKit secrets for sensitive values required at build time (Prisma schema validation, Sentry source map upload):

```dockerfile
RUN --mount=type=secret,id=database_url \
    --mount=type=secret,id=encryption_key \
    --mount=type=secret,id=redis_url \
    --mount=type=secret,id=sentry_auth_token \
    /tmp/read-secrets.sh pnpm build --filter=@hivecfm/web...
```

The `read-secrets.sh` script reads secrets from `/run/secrets/` and exports them as environment variables. Sentry source map uploads are restricted to `amd64` platform to avoid duplicate uploads during multi-platform builds.

#### Stage 3: Runner (Production)

The production runner is a minimal image that:

- Creates a non-root `nextjs` user (UID 1001)
- Copies only the Next.js standalone output (no `node_modules` bloat)
- Copies static assets, Prisma client, and schema
- Copies RLS (Row Level Security) SQL scripts
- Installs `prisma@6` globally for runtime migrations
- Installs `supercronic` for cron job scheduling
- Installs `curl` for health checks
- Declares two volumes: `/home/nextjs/apps/web/uploads/` and `/home/nextjs/apps/web/saml-connection`
- Runs as `USER nextjs`
- Exposes port 3000
- Entry point: `/home/nextjs/start.sh`

**Startup script (`next-start.sh`):**

The startup script executes sequentially:

1. Run Prisma database migrations (`db:migrate:deploy`) with a 300-second timeout
2. Run SAML database setup with a 60-second timeout
3. Apply RLS policies if `psql` is available (non-fatal if skipped)
4. Start the Next.js production server (`node apps/web/server.js`)

### 2.2. License Portal Dockerfile (`apps/license-portal/Dockerfile`)

The license portal uses a simpler three-stage build:

| Stage | Base | Purpose |
|---|---|---|
| `deps` | `node:22-alpine` | Install dependencies with npm |
| `builder` | `node:22-alpine` | Build the Next.js application |
| `runner` | `node:22-alpine` | Production server on port 3101 |

Key differences from hivecfm-core:
- Uses npm instead of pnpm
- Includes the shared `packages/license-crypto` workspace package
- Runs on port 3101
- Uses `node server.js` directly (no migration script)
- Creates `nodejs` group (GID 1001) and `nextjs` user (UID 1001)

---

## 3. Docker Compose

HiveCFM provides multiple Docker Compose configurations for different environments.

### 3.1. Compose File Hierarchy

```mermaid
graph LR
    A["docker-compose.dev.yml<br/>Development services only"] --> D["Local Dev"]
    B["docker-compose.yml<br/>Full platform stack"] --> E["Staging / Demo"]
    B --> F["docker-compose.prod.yml<br/>Production overrides"]
    F --> G["Production"]
    H["docker/docker-compose.yml<br/>Upstream reference"] --> I["Reference only"]
    J["apps/license-portal/<br/>docker-compose.yml"] --> K["License Portal"]
```

### 3.2. Development Compose (`docker-compose.dev.yml`)

Provides infrastructure services only -- the application runs via `pnpm dev` on the host:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg17` | 5432 | Database with pgvector |
| `mailhog` | `arjenz/mailhog` | 8025, 1025 | Email testing (SMTP capture) |
| `valkey` | `valkey/valkey` (pinned digest) | 6379 | Cache and rate limiting |
| `minio` | `minio/minio` (pinned release) | 9000, 9001 | S3-compatible object storage |

**Usage:**

```bash
# Start development infrastructure
docker compose -f docker-compose.dev.yml up -d

# Shortcut via package.json
pnpm db:up

# Stop infrastructure
pnpm db:down
```

**Volumes:** `postgres`, `valkey-data`, `minio-data` (all local driver).

### 3.3. Full Platform Compose (`docker-compose.yml`)

The main compose file defines the complete platform with all services:

#### Services

| Service | Image / Build | Ports | Health Check | Dependencies |
|---|---|---|---|---|
| `hivecfm-core` | Built from `apps/web/Dockerfile` | 127.0.0.1:3000:3000 | `curl -f http://localhost:3000/health` | postgres, redis, minio |
| `postgres` | `pgvector/pgvector:pg17` | (none, internal) | `pg_isready -U postgres -d hivecfm` | -- |
| `redis` | `valkey/valkey:latest` | (none, internal) | `valkey-cli ping` | -- |
| `minio` | `minio/minio:latest` | 127.0.0.1:9000, 127.0.0.1:9001 | `mc ready local` | -- |
| `minio-init` | `minio/mc:latest` | (none) | -- | minio |
| `mock-salesforce` | `node:22-alpine` + json-server | 127.0.0.1:3003:3000 | HTTP check on /cases | -- |
| `superset` | `apache/superset:3.1.0` | 127.0.0.1:3002:8088 | `curl -f http://localhost:8088/health` | postgres, redis |

#### Health Check Defaults (YAML anchor)

All services share a baseline health check configuration:

```yaml
x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 3
```

Individual services override `start_period` and `interval` as needed. PostgreSQL uses a 60-second start period; hivecfm-core and Superset use 120 seconds.

#### Build Secrets

Docker Compose defines four build secrets sourced from environment variables:

| Secret ID | Environment Source | Purpose |
|---|---|---|
| `database_url` | `DATABASE_URL` | Prisma schema validation at build time |
| `encryption_key` | `ENCRYPTION_KEY` | Application encryption at build time |
| `redis_url` | `REDIS_URL` | Cache configuration at build time |
| `sentry_auth_token` | `SENTRY_AUTH_TOKEN` | Sentry source map upload |

#### Network

All services join the `hivecfm-network` bridge network. Port bindings use `127.0.0.1` to restrict access to localhost -- external access is provided via nginx reverse proxy.

#### Volumes

| Volume | Mount Point | Purpose |
|---|---|---|
| `hivecfm-postgres-data` | `/var/lib/postgresql/data` | PostgreSQL data persistence |
| `hivecfm-redis-data` | `/data` | Valkey AOF persistence |
| `hivecfm-minio-data` | `/data` | Object storage persistence |
| `hivecfm-uploads` | `/home/nextjs/apps/web/uploads` | File upload storage |
| `hivecfm-saml` | `/home/nextjs/apps/web/saml-connection` | SAML SSO configuration |
| `hivecfm-superset-data` | `/app/superset_home` | Superset metadata |

#### MinIO Initialization

The `minio-init` service is a one-shot container that:

1. Creates an alias to the MinIO server
2. Creates the upload bucket (`hivecfm-uploads` by default)
3. Sets public download access on the `public` prefix
4. Exits after completion

#### Database Initialization (`scripts/init-db.sh`)

On first PostgreSQL startup, the init script:

1. Creates a `superset_readonly` role with SELECT-only access to the `public` schema
2. Creates the `superset_app` database for Superset metadata
3. Creates a `superset` role with full access to `superset_app`
4. Enables the `vector` extension (pgvector for AI/ML features)
5. Enables the `uuid-ossp` extension

### 3.4. Production Overrides (`docker-compose.prod.yml`)

Apply with:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Resource limits:**

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation |
|---|---|---|---|---|
| hivecfm-core | 2 | 2 GB | 0.5 | 512 MB |
| postgres | 2 | 4 GB | 0.5 | 1 GB |
| redis | 1 | 1 GB | 0.25 | 256 MB |
| superset | 2 | 2 GB | 0.5 | 512 MB |

**PostgreSQL tuning:**

Production overrides include optimized PostgreSQL settings:

```
shared_buffers=1GB
effective_cache_size=3GB
maintenance_work_mem=256MB
checkpoint_completion_target=0.9
wal_buffers=64MB
max_worker_processes=4
max_parallel_workers_per_gather=2
max_parallel_workers=4
min_wal_size=1GB
max_wal_size=4GB
random_page_cost=1.1
effective_io_concurrency=200
```

**Valkey/Redis tuning:**

```
maxmemory 768mb
maxmemory-policy allkeys-lru
```

**Additional production settings:**

- `NODE_ENV=production` and `LOG_LEVEL=warn` for hivecfm-core
- Direct port access disabled (all access via nginx)
- JSON file logging with size rotation (50 MB max, 5 files for app; 100 MB, 10 files for DB)
- Restart policy: on-failure with 3 max attempts and 120-second window
- Network bridge with IP masquerade enabled

### 3.5. License Portal Compose (`apps/license-portal/docker-compose.yml`)

Standalone compose for the license management portal:

```yaml
services:
  hivelic:
    build:
      context: ../..
      dockerfile: apps/license-portal/Dockerfile
    container_name: hivelic-portal
    ports:
      - "127.0.0.1:3101:3101"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3101/api/auth/session"]
```

---

## 4. Azure Container Apps Deployment

Azure Container Apps is the primary production deployment target for HiveCFM.

### 4.1. Architecture

```mermaid
graph TB
    subgraph "Azure Cloud"
        subgraph "rg-hivecfm (Resource Group)"
            subgraph "hivecfm-env (Container Apps Environment)"
                CA_Core["Container App<br/>hivecfm-core<br/>:3000"]
                CA_LP["Container App<br/>license-portal<br/>:3101"]
            end

            ACR["Azure Container Registry<br/>hivecfmregistry.azurecr.io"]

            subgraph "Data Services"
                AzPG["Azure Database for PostgreSQL<br/>Flexible Server<br/>+ pgvector"]
                AzRedis["Azure Cache for Redis<br/>"]
                AzBlob["Azure Blob Storage<br/>S3-compatible endpoint"]
            end
        end

        AzDNS["Azure DNS / Custom Domain<br/>hivecfm.xcai.io"]
        AzCert["Managed TLS Certificate"]
    end

    Users["Users / API Clients"] --> AzDNS
    AzDNS --> CA_Core
    AzDNS --> CA_LP
    ACR --> CA_Core
    ACR --> CA_LP
    CA_Core --> AzPG
    CA_Core --> AzRedis
    CA_Core --> AzBlob
    AzCert --> CA_Core
```

### 4.2. Azure Resources

| Resource | Type | Name |
|---|---|---|
| Resource Group | `Microsoft.Resources/resourceGroups` | `rg-hivecfm` |
| Container Apps Environment | `Microsoft.App/managedEnvironments` | `hivecfm-env` |
| Container App (core) | `Microsoft.App/containerApps` | `hivecfm-core` |
| Container App (portal) | `Microsoft.App/containerApps` | `license-portal` |
| Container Registry | `Microsoft.ContainerRegistry/registries` | `hivecfmregistry` |
| Build Agent Pool | Azure Pipelines | `hivecfm-build` |

### 4.3. Container Registry

- **Registry URL:** `hivecfmregistry.azurecr.io`
- **Repositories:**
  - `hivecfm-core` -- Main application image
  - `hivecfm-license-portal` -- License management portal
- **Tagging strategy:** Each build is tagged with the Azure DevOps Build ID (`$(Build.BuildId)`) and `latest`
- **Service connection:** `hivecfm-acr` (Docker Registry service connection in Azure DevOps)

### 4.4. Container App Configuration

**hivecfm-core:**

| Setting | Value |
|---|---|
| Image | `hivecfmregistry.azurecr.io/hivecfm-core:<build-id>` |
| Ingress | External, port 3000 |
| Min replicas | 1 (configurable) |
| Max replicas | 10 (configurable) |
| CPU | 1.0 - 2.0 cores |
| Memory | 2.0 - 4.0 Gi |
| Health probe | HTTP GET `/health` on port 3000 |
| Readiness probe | HTTP GET `/api/ready` on port 3000 |

**Scaling rules:** Container Apps scaling can be configured based on HTTP concurrent requests or CPU/memory utilization. The recommended starting configuration:

- Scale to zero: Disabled (minimum 1 replica for always-on availability)
- Scale-up trigger: 100 concurrent HTTP requests per replica
- CPU threshold: 60% average utilization
- Memory threshold: 60% average utilization

### 4.5. Managed Certificates and Custom Domains

Azure Container Apps provides managed TLS certificates for custom domains:

1. Add custom domain `hivecfm.xcai.io` to the Container App
2. Verify domain ownership via CNAME or TXT record
3. Azure automatically provisions and renews Let's Encrypt certificates
4. HTTPS-only mode enabled (HTTP redirects to HTTPS)

### 4.6. Azure Supporting Services

**Azure Database for PostgreSQL Flexible Server:**

- PostgreSQL 17 with pgvector extension enabled
- Burstable or General Purpose tier based on workload
- Automated backups with 7-35 day retention
- High availability with zone-redundant standby (optional)
- Connection via `DATABASE_URL` environment variable in Container App

**Azure Cache for Redis:**

- Standard or Premium tier
- TLS-enabled connections
- Connection via `REDIS_URL` environment variable
- Used for caching, rate limiting, and session management

**Azure Blob Storage:**

- S3-compatible endpoint for file uploads
- Configured via `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- Container for survey images, attachments, and exported data

---

## 5. Azure CI/CD Pipeline

### 5.1. Pipeline Configuration (`azure-pipelines.yml`)

The Azure DevOps pipeline triggers on pushes to the `hivecfm-main` branch and runs on a self-hosted agent pool named `hivecfm-build`.

```mermaid
graph LR
    subgraph "Stage 1: Build and Push Images"
        direction TB
        B1["Job: BuildCore<br/>Build hivecfm-core"]
        B2["Job: BuildLicensePortal<br/>Build license-portal"]
    end

    subgraph "Stage 2: Deploy to Container Apps"
        direction TB
        D1["Job: DeployCore<br/>Deploy hivecfm-core"]
        D2["Job: DeployLicensePortal<br/>Deploy license-portal"]
    end

    B1 --> D1
    B2 --> D2
```

### 5.2. Pipeline Variables

| Variable | Value | Purpose |
|---|---|---|
| `dockerRegistryServiceConnection` | `hivecfm-acr` | ACR service connection |
| `containerRegistry` | `hivecfmregistry.azurecr.io` | Registry URL |
| `tag` | `$(Build.BuildId)` | Unique image tag per build |
| `DOCKER_BUILDKIT` | `1` | Enable BuildKit for secrets and cache mounts |

### 5.3. Build Stage

#### BuildCore Job

1. **Login to ACR** -- Uses the Docker@2 task with the `hivecfm-acr` service connection
2. **Create build secrets** -- Writes placeholder secrets to `/tmp/docker-secrets/` for build-time Prisma validation:
   - `database_url`: Placeholder PostgreSQL URL
   - `encryption_key`: Placeholder 32-character key
   - `redis_url`: Placeholder Redis URL
   - `sentry_auth_token`: Empty (source maps skipped unless token provided)
3. **Build Docker image** -- Runs `docker build` with:
   - Dockerfile: `apps/web/Dockerfile`
   - Build arg: `NODE_OPTIONS="--max_old_space_size=8192"`
   - Four `--secret` mounts from the temporary files
   - Tags: `<registry>/hivecfm-core:<build-id>` and `<registry>/hivecfm-core:latest`
4. **Clean up secrets** -- Removes `/tmp/docker-secrets/`
5. **Push images** -- Pushes both tagged and latest images to ACR

#### BuildLicensePortal Job

Uses the Docker@2 task `buildAndPush` command for a simpler build:
- Repository: `hivecfm-license-portal`
- Dockerfile: `apps/license-portal/Dockerfile`
- Build context: repository root
- Tags: Build ID and `latest`

Both build jobs run in parallel.

### 5.4. Deploy Stage

The deploy stage depends on the build stage completing successfully. Both deploy jobs run in parallel.

#### DeployCore Job

```bash
az login --identity
az containerapp update \
  --name hivecfm-core \
  --resource-group rg-hivecfm \
  --image hivecfmregistry.azurecr.io/hivecfm-core:$(Build.BuildId)
```

Uses managed identity authentication (no stored credentials). The `az containerapp update` command performs a rolling update of the container app with zero downtime.

#### DeployLicensePortal Job

```bash
az login --identity
az containerapp update \
  --name license-portal \
  --resource-group rg-hivecfm \
  --image hivecfmregistry.azurecr.io/hivecfm-license-portal:$(Build.BuildId)
```

### 5.5. Pipeline Flow Diagram

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as hivecfm-main
    participant ADO as Azure DevOps
    participant ACR as Container Registry
    participant ACA as Container Apps

    Dev->>Git: Push to hivecfm-main
    Git->>ADO: Trigger pipeline

    par Build Core
        ADO->>ADO: Create build secrets
        ADO->>ADO: docker build hivecfm-core
        ADO->>ACR: Push hivecfm-core:tag
        ADO->>ACR: Push hivecfm-core:latest
    and Build License Portal
        ADO->>ADO: docker build license-portal
        ADO->>ACR: Push license-portal:tag
        ADO->>ACR: Push license-portal:latest
    end

    par Deploy Core
        ADO->>ACA: az containerapp update hivecfm-core
        ACA->>ACR: Pull hivecfm-core:tag
        ACA->>ACA: Rolling update
    and Deploy License Portal
        ADO->>ACA: az containerapp update license-portal
        ACA->>ACR: Pull license-portal:tag
        ACA->>ACA: Rolling update
    end
```

---

## 6. Kubernetes / Helm Deployment

### 6.1. Helm Chart Overview

The Helm chart is located at `helm-chart/` and provides a production-ready Kubernetes deployment.

**Chart metadata (`Chart.yaml`):**

| Field | Value |
|---|---|
| Name | `hivecfm` |
| Type | `application` |
| Version | `0.0.0-dev` |
| Dependencies | PostgreSQL 16.4.16 (Bitnami), Redis 20.11.2 (Bitnami) |

### 6.2. Chart Structure

```
helm-chart/
  Chart.yaml              # Chart metadata and dependencies
  Chart.lock              # Locked dependency versions
  values.yaml             # Default configuration values
  charts/
    postgresql-16.4.16.tgz  # Bitnami PostgreSQL subchart
    redis-20.11.2.tgz       # Bitnami Redis subchart
  templates/
    _helpers.tpl           # Template helper functions
    deployment.yaml        # Application Deployment
    service.yaml           # ClusterIP Service
    ingress.yaml           # Ingress resource
    hpa.yaml               # Horizontal Pod Autoscaler
    secrets.yaml           # Kubernetes Secret (auto-generated)
    externalsecrets.yaml   # ExternalSecrets integration
    serviceaccount.yaml    # ServiceAccount for RBAC
    servicemonitor.yaml    # Prometheus ServiceMonitor
    NOTES.txt              # Post-install instructions
```

### 6.3. Installation

```bash
# Add Bitnami repository for subchart dependencies
helm dependency build ./helm-chart

# Install with default values
helm install hivecfm ./helm-chart \
  --namespace hivecfm \
  --create-namespace

# Install with custom values
helm install hivecfm ./helm-chart \
  --namespace hivecfm \
  --create-namespace \
  -f my-values.yaml

# Upgrade an existing release
helm upgrade hivecfm ./helm-chart \
  --namespace hivecfm \
  -f my-values.yaml
```

### 6.4. Deployment Configuration (`values.yaml`)

#### Deployment Strategy

```yaml
deployment:
  strategy:
    type: RollingUpdate
  replicas: 1
  revisionHistoryLimit: 2
```

#### Container Image

```yaml
deployment:
  image:
    repository: "hivecfmregistry.azurecr.io/hivecfm-core"
    digest: ""           # Takes precedence over tag if set
    pullPolicy: IfNotPresent
```

For HiveCFM deployments, override the repository:

```yaml
deployment:
  image:
    repository: "hivecfmregistry.azurecr.io/hivecfm-core"
    tag: "latest"
```

#### Container Ports

| Port Name | Container Port | Protocol | Exposed via Service |
|---|---|---|---|
| `http` | 3000 | TCP | Yes |
| `metrics` | 9464 | TCP | Yes |

#### Resource Requests and Limits

```yaml
deployment:
  resources:
    limits:
      memory: 2Gi
    requests:
      memory: 1Gi
      cpu: "1"
```

#### Security Context

```yaml
deployment:
  containerSecurityContext:
    readOnlyRootFilesystem: true
    runAsNonRoot: true
```

#### Health Probes

| Probe | Type | Path/Port | Period | Timeout | Failures | Initial Delay |
|---|---|---|---|---|---|---|
| Startup | TCP Socket | port 3000 | 10s | -- | 30 | -- |
| Readiness | HTTP GET | `/health:3000` | 10s | 5s | 5 | 10s |
| Liveness | HTTP GET | `/health:3000` | 10s | 5s | 5 | 10s |

The startup probe allows up to 300 seconds (30 failures x 10s period) for the application to start, accommodating database migrations.

### 6.5. Horizontal Pod Autoscaler (HPA)

The HPA is enabled by default:

```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 60
```

This scales pods between 1 and 10 replicas based on CPU and memory utilization thresholds.

### 6.6. Service Configuration

```yaml
service:
  enabled: true
  type: ClusterIP
```

The Service exposes both the `http` (3000) and `metrics` (9464) ports based on the deployment port definitions.

### 6.7. Ingress Configuration

```yaml
ingress:
  enabled: false
  ingressClassName: alb
  hosts:
    - host: hivecfm.example.com
      paths:
        - path: /
          pathType: "Prefix"
          serviceName: "hivecfm"
```

For HiveCFM, override with your domain and ingress class:

```yaml
ingress:
  enabled: true
  ingressClassName: nginx
  hosts:
    - host: hivecfm.example.com
      paths:
        - path: /
          pathType: Prefix
          serviceName: hivecfm
  tls:
    - secretName: hivecfm-tls
      hosts:
        - hivecfm.example.com
```

### 6.8. Secrets Management

#### Built-in Secret Generation

When `secret.enabled: true` (default), the chart auto-generates a Kubernetes Secret named `<release>-app-secrets` containing:

| Key | Source |
|---|---|
| `DATABASE_URL` | Built from PostgreSQL subchart credentials |
| `REDIS_URL` | Built from Redis subchart credentials |
| `CRON_SECRET` | Auto-generated 32-char alphanumeric |
| `ENCRYPTION_KEY` | Auto-generated 32-char alphanumeric |
| `NEXTAUTH_SECRET` | Auto-generated 32-char alphanumeric |
| `ENTERPRISE_LICENSE_KEY` | From `enterprise.licenseKey` (if set) |
| `REDIS_PASSWORD` | Auto-generated 16-char alphanumeric |
| `POSTGRES_ADMIN_PASSWORD` | Auto-generated 16-char alphanumeric |
| `POSTGRES_USER_PASSWORD` | Auto-generated 16-char alphanumeric |

The helper templates (`_helpers.tpl`) implement idempotent secret generation: if a secret already exists in the namespace, its values are preserved on upgrade. New secrets are only generated on first install.

#### External Secrets Integration

For production environments using AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault:

```yaml
secret:
  enabled: false

externalSecret:
  enabled: true
  secretStore:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  refreshInterval: "1h"
  files:
    app-secrets:
      dataFrom:
        key: hivecfm/production
```

This requires the External Secrets Operator to be installed in the cluster.

### 6.9. PostgreSQL Subchart

```yaml
postgresql:
  enabled: true
  fullnameOverride: "hivecfm-postgresql"
  image:
    repository: pgvector/pgvector
    tag: 0.8.0-pg17
  auth:
    username: hivecfm
    database: hivecfm
    existingSecret: "hivecfm-app-secrets"
  primary:
    persistence:
      enabled: true
      size: 10Gi
    podSecurityContext:
      fsGroup: 1001
      runAsUser: 1001
```

To use an external database, disable the subchart:

```yaml
postgresql:
  enabled: false
  externalDatabaseUrl: "postgresql://user:pass@host:5432/hivecfm"
```

### 6.10. Redis Subchart

```yaml
redis:
  enabled: true
  fullnameOverride: "hivecfm-redis"
  architecture: standalone
  auth:
    enabled: true
    existingSecret: "hivecfm-app-secrets"
    existingSecretPasswordKey: "REDIS_PASSWORD"
  master:
    persistence:
      enabled: true
```

To use an external Redis:

```yaml
redis:
  enabled: false
  externalRedisUrl: "redis://:password@redis-host:6379"
```

### 6.11. ServiceMonitor for Prometheus

When the Prometheus Operator is installed (detected via `monitoring.coreos.com/v1` API), the chart creates a ServiceMonitor:

```yaml
serviceMonitor:
  enabled: true
  endpoints:
    - interval: 5s
      path: /metrics
      port: metrics
```

This scrapes the `/metrics` endpoint on port 9464 every 5 seconds.

---

## 7. OpenShift On-Premises Deployment

The Helm chart is compatible with OpenShift with the following adjustments.

### 7.1. OpenShift Architecture

```mermaid
graph TB
    subgraph "OpenShift Cluster"
        subgraph "hivecfm Namespace"
            Route["OpenShift Route<br/>hivecfm.apps.cluster.local<br/>Edge TLS Termination"]
            Deploy["Deployment<br/>hivecfm-core"]
            SVC["Service<br/>ClusterIP:3000"]
            HPA["HPA<br/>1-10 replicas"]
            SM["ServiceMonitor<br/>/metrics"]
        end

        subgraph "Data Namespace"
            PG["PostgreSQL<br/>StatefulSet"]
            Redis["Redis<br/>StatefulSet"]
            PVC1["PVC: 10Gi<br/>PostgreSQL Data"]
            PVC2["PVC: 8Gi<br/>Redis Data"]
        end

        subgraph "Operators"
            PGO["Crunchy PostgreSQL<br/>Operator"]
            ESO["External Secrets<br/>Operator"]
            PMO["Prometheus<br/>Operator"]
        end
    end

    Users["Users"] --> Route
    Route --> SVC
    SVC --> Deploy
    HPA --> Deploy
    Deploy --> PG
    Deploy --> Redis
    PGO --> PG
    ESO --> Deploy
    PMO --> SM
    PG --> PVC1
    Redis --> PVC2
```

### 7.2. Routes vs Ingress

OpenShift uses Routes instead of Kubernetes Ingress. Disable Ingress and create an OpenShift Route:

```yaml
# values-openshift.yaml
ingress:
  enabled: false
```

Create a Route separately:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: hivecfm
  namespace: hivecfm
spec:
  host: hivecfm.apps.cluster.example.com
  to:
    kind: Service
    name: hivecfm
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
```

### 7.3. Security Context Constraints (SCCs)

The Helm chart sets `runAsNonRoot: true` and `readOnlyRootFilesystem: true`, which is compatible with OpenShift's `restricted-v2` SCC. No custom SCC is required.

However, the PostgreSQL and Redis subcharts require specific UIDs. Create a dedicated SCC or use the `anyuid` SCC for the database namespace:

```bash
oc adm policy add-scc-to-user anyuid -z default -n hivecfm-data
```

Or configure the subcharts to use OpenShift-compatible security contexts:

```yaml
# values-openshift.yaml
postgresql:
  primary:
    podSecurityContext:
      enabled: false
    containerSecurityContext:
      enabled: false

redis:
  master:
    podSecurityContext:
      enabled: false
    containerSecurityContext:
      enabled: false
```

### 7.4. Operator Requirements

For enterprise OpenShift deployments, the following operators are recommended:

| Operator | Purpose | Required |
|---|---|---|
| Crunchy PostgreSQL Operator | Managed PostgreSQL with HA, backups | Recommended |
| External Secrets Operator | Vault/Azure Key Vault integration | Recommended |
| Prometheus Operator | Metrics collection and alerting | Optional |
| Cert Manager | TLS certificate automation | Optional (Routes handle TLS) |

When using the Crunchy PostgreSQL Operator, disable the Bitnami subchart:

```yaml
postgresql:
  enabled: false
  externalDatabaseUrl: "postgresql://..."
```

### 7.5. Persistent Volume Claims

OpenShift clusters typically provide dynamic provisioning via StorageClasses. Verify available StorageClasses:

```bash
oc get storageclass
```

Override the default storage class if needed:

```yaml
postgresql:
  primary:
    persistence:
      storageClass: "ocs-storagecluster-ceph-rbd"
      size: 50Gi

redis:
  master:
    persistence:
      storageClass: "ocs-storagecluster-ceph-rbd"
      size: 8Gi
```

### 7.6. Network Policies

For multi-tenant OpenShift clusters, define NetworkPolicies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hivecfm-allow-ingress
  namespace: hivecfm
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: hivecfm
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              network.openshift.io/policy-group: ingress
      ports:
        - protocol: TCP
          port: 3000
  policyTypes:
    - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hivecfm-allow-database
  namespace: hivecfm
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: hivecfm
  egress:
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: hivecfm-postgresql
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: hivecfm-redis
      ports:
        - protocol: TCP
          port: 6379
  policyTypes:
    - Egress
```

---

## 8. Environment Variables

### 8.1. Required Variables

These must be set for any deployment to function.

| Variable | Example | Description |
|---|---|---|
| `WEBAPP_URL` | `https://hivecfm.xcai.io` | Public-facing application URL |
| `NEXTAUTH_URL` | `https://hivecfm.xcai.io` | NextAuth callback URL (must match WEBAPP_URL) |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` | NextAuth JWT signing secret |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | Application-level encryption key (2FA, link surveys) |
| `CRON_SECRET` | `openssl rand -hex 32` | API secret for cron job authentication |
| `DATABASE_URL` | `postgresql://postgres:pass@host:5432/hivecfm?schema=public` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis/Valkey connection URL |

### 8.2. Database Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (required) | Full PostgreSQL connection string with schema |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL superuser password (Docker Compose) |
| `SUPERSET_DB_PASSWORD` | `superset` | Superset database user password |

### 8.3. Email / SMTP Configuration

| Variable | Default | Description |
|---|---|---|
| `MAIL_FROM` | `noreply@hivecfm.xcai.io` | Sender email address |
| `MAIL_FROM_NAME` | `HiveCFM` | Sender display name |
| `SMTP_HOST` | `localhost` | SMTP server hostname |
| `SMTP_PORT` | `1025` | SMTP server port |
| `SMTP_USER` | -- | SMTP authentication username |
| `SMTP_PASSWORD` | -- | SMTP authentication password |
| `SMTP_SECURE_ENABLED` | `0` | Enable TLS for port 465 |
| `SMTP_AUTHENTICATED` | `1` | Require SMTP authentication |
| `SMTP_REJECT_UNAUTHORIZED_TLS` | `1` | Reject unauthorized TLS certificates |

### 8.4. S3 / Object Storage

| Variable | Default | Description |
|---|---|---|
| `S3_ACCESS_KEY` | `hivecfm` | S3-compatible access key (MinIO root user) |
| `S3_SECRET_KEY` | `hivecfm-secret-key` | S3-compatible secret key (MinIO root password) |
| `S3_REGION` | `us-east-1` | S3 region |
| `S3_BUCKET_NAME` | `hivecfm-uploads` | Upload bucket name |
| `S3_ENDPOINT_URL` | `http://minio:9000` | S3 endpoint (empty for AWS S3) |
| `S3_PUBLIC_ENDPOINT_URL` | -- | Public endpoint for presigned POST URLs |
| `S3_FORCE_PATH_STYLE` | `1` | Use path-style URLs (1 for MinIO, 0 for AWS) |
| `S3_INTERNAL_ENDPOINT` | `http://minio:9000` | Internal endpoint for server-side operations |
| `MINIO_ROOT_USER` | `hivecfm` | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | `hivecfm-secret-key` | MinIO admin password |

### 8.5. Feature Flags

| Variable | Default | Description |
|---|---|---|
| `EMAIL_VERIFICATION_DISABLED` | `1` | Disable email verification for signups |
| `PASSWORD_RESET_DISABLED` | `1` | Disable password reset functionality |
| `EMAIL_AUTH_DISABLED` | `0` | Disable email/password login |
| `INVITE_DISABLED` | `0` | Disable organization invite signups |
| `RATE_LIMITING_DISABLED` | `0` | Disable API rate limiting |

### 8.6. OAuth / SSO Providers

| Variable | Description |
|---|---|
| `GITHUB_ID` | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `AZUREAD_CLIENT_ID` | Azure AD App Registration Client ID |
| `AZUREAD_CLIENT_SECRET` | Azure AD App Registration Client Secret |
| `AZUREAD_TENANT_ID` | Azure AD Tenant ID |
| `OIDC_CLIENT_ID` | OpenID Connect Client ID |
| `OIDC_CLIENT_SECRET` | OpenID Connect Client Secret |
| `OIDC_ISSUER` | OIDC Issuer URL |
| `OIDC_DISPLAY_NAME` | OIDC Provider display name in UI |
| `OIDC_SIGNING_ALGORITHM` | OIDC token signing algorithm |

### 8.7. HiveCFM-Specific: Genesys Cloud Integration

| Variable | Default | Description |
|---|---|---|
| `GENESYS_CLIENT_ID` | -- | Genesys Cloud OAuth Client ID |
| `GENESYS_CLIENT_SECRET` | -- | Genesys Cloud OAuth Client Secret |
| `GENESYS_WEBHOOK_SECRET` | -- | Webhook signature verification key |
| `GENESYS_REGION` | `mypurecloud.com` | Genesys Cloud region hostname |

### 8.8. HiveCFM-Specific: Twilio SMS

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Sender phone number (E.164 format) |

### 8.9. Analytics Integration

| Variable | Default | Description |
|---|---|---|
| `SUPERSET_BASE_URL` | `http://hivecfm-superset:8088` | Internal Superset URL |
| `SUPERSET_ADMIN_USERNAME` | `admin` | Superset admin username |
| `SUPERSET_ADMIN_PASSWORD` | -- | Superset admin password |
| `SUPERSET_SECRET_KEY` | -- | Superset Flask secret key |
| `SUPERSET_PORT` | `3002` | External Superset port (nginx) |
| `NEXT_PUBLIC_SUPERSET_BASE_URL` | -- | Client-side Superset URL for iframe embedding |
| `GUEST_TOKEN_JWT_SECRET` | -- | JWT secret for Superset guest tokens |
| `METABASE_URL` | `http://localhost:3001` | Metabase embedding URL |
| `METABASE_SECRET_KEY` | -- | Metabase embedding secret |
| `METABASE_PORT` | `3001` | External Metabase port |
| `METABASE_DB_PASSWORD` | `metabase` | Metabase database user password |

### 8.10. Workflow Automation (n8n)

| Variable | Default | Description |
|---|---|---|
| `N8N_BASE_URL` | `http://hivecfm-n8n:5678` | Internal n8n URL |
| `N8N_API_KEY` | -- | n8n API authentication key |
| `N8N_WEBHOOK_BASE_URL` | `https://n8n.hivecfm.xcai.io` | Public n8n webhook URL |

### 8.11. OIDC Provider (for Superset/n8n SSO)

| Variable | Default | Description |
|---|---|---|
| `OIDC_ISSUER_URL` | `https://hivecfm.xcai.io/api/oidc` | OIDC issuer URL |
| `OIDC_SUPERSET_CLIENT_ID` | `superset-client` | OIDC client ID for Superset |
| `OIDC_SUPERSET_CLIENT_SECRET` | -- | OIDC client secret for Superset |
| `OIDC_N8N_CLIENT_ID` | `n8n-client` | OIDC client ID for n8n |
| `OIDC_N8N_CLIENT_SECRET` | -- | OIDC client secret for n8n |

### 8.12. Monitoring and Observability

| Variable | Default | Description |
|---|---|---|
| `SENTRY_DSN` | -- | Sentry error tracking DSN |
| `SENTRY_AUTH_TOKEN` | -- | Sentry build plugin auth token |
| `SENTRY_ENVIRONMENT` | -- | Sentry environment name |
| `OPENTELEMETRY_LISTENER_URL` | -- | OpenTelemetry collector endpoint |
| `PROMETHEUS_ENABLED` | `0` | Enable Prometheus metrics endpoint |
| `PROMETHEUS_EXPORTER_PORT` | `9090` | Prometheus exporter port |
| `LOG_LEVEL` | `info` | Minimum log level (debug, info, warn, error, fatal) |
| `AUDIT_LOG_ENABLED` | `0` | Enable audit logging |
| `AUDIT_LOG_GET_USER_IP` | `0` | Include client IP in audit logs |

### 8.13. Alert Configuration

| Variable | Default | Description |
|---|---|---|
| `ALERT_CSAT_THRESHOLD` | `3` | Low CSAT threshold (1-5 scale) |
| `ALERT_EMAIL_RECIPIENTS` | -- | Comma-separated alert email addresses |
| `ALERT_WEBHOOK_URL` | -- | Slack/Teams webhook URL for alerts |

### 8.14. Survey Throttling

| Variable | Default | Description |
|---|---|---|
| `SURVEY_THROTTLE_HOURS` | `24` | Minimum hours between surveys per customer |
| `SURVEY_MAX_PER_MONTH` | `4` | Maximum surveys per customer per month |

### 8.15. Miscellaneous

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Node.js environment |
| `BASE_PATH` | -- | Sub-path deployment (build-time only) |
| `PUBLIC_URL` | (WEBAPP_URL) | Public URL for client-facing routes |
| `ASSET_PREFIX_URL` | -- | CDN URL for static assets |
| `ENTERPRISE_LICENSE_KEY` | -- | Enterprise feature license key |
| `SESSION_MAX_AGE` | `86400` | Session timeout in seconds (24 hours) |
| `USER_MANAGEMENT_MINIMUM_ROLE` | `manager` | Minimum role for user management |
| `AUTH_SSO_DEFAULT_TEAM_ID` | -- | Auto-assign SSO users to organization |
| `AUTH_SKIP_INVITE_FOR_SSO` | -- | Allow SSO signup without invite |
| `UNSPLASH_ACCESS_KEY` | -- | Unsplash API key for survey backgrounds |
| `PRIVACY_URL` | -- | Privacy policy page URL |
| `TERMS_URL` | -- | Terms of service page URL |
| `IMPRINT_URL` | -- | Imprint / legal page URL |
| `IMPRINT_ADDRESS` | -- | Company address for email footer |
| `TURNSTILE_SITE_KEY` | -- | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | -- | Cloudflare Turnstile secret key |
| `RECAPTCHA_SITE_KEY` | -- | Google reCAPTCHA v3 site key |
| `RECAPTCHA_SECRET_KEY` | -- | Google reCAPTCHA v3 secret key |
| `LINGODOTDEV_API_KEY` | -- | Lingo.dev API key for translations |
| `OPENAI_API_KEY` | -- | OpenAI API key for AI auto-translate |
| `HIVECFM_PORT` | `3000` | Host port for Docker Compose binding |
| `NOTION_OAUTH_CLIENT_ID` | -- | Notion integration OAuth Client ID |
| `NOTION_OAUTH_CLIENT_SECRET` | -- | Notion integration OAuth Client Secret |
| `GOOGLE_SHEETS_CLIENT_ID` | -- | Google Sheets integration Client ID |
| `GOOGLE_SHEETS_CLIENT_SECRET` | -- | Google Sheets integration Client Secret |
| `GOOGLE_SHEETS_REDIRECT_URL` | -- | Google Sheets OAuth redirect URL |
| `AIRTABLE_CLIENT_ID` | -- | Airtable integration Client ID |
| `SLACK_CLIENT_ID` | -- | Slack integration Client ID |
| `SLACK_CLIENT_SECRET` | -- | Slack integration Client Secret |
| `STRIPE_SECRET_KEY` | -- | Stripe billing secret key |
| `STRIPE_WEBHOOK_SECRET` | -- | Stripe webhook endpoint secret |

---

## 9. Nginx Reverse Proxy

### 9.1. Architecture

```mermaid
graph LR
    subgraph "Internet"
        Client["HTTPS Clients"]
    end

    subgraph "Nginx (Host)"
        HTTP["Port 80<br/>HTTP Redirect"]
        HTTPS443["Port 443<br/>hivecfm.xcai.io"]
        HTTPS3001["Port 3001<br/>Metabase"]
        HTTPS3002["Port 3002<br/>Superset"]
        HTTPS5678["Port 5678<br/>n8n"]
        HTTPSSF["Port 443<br/>salesforce.hivecfm.xcai.io"]
    end

    subgraph "Docker (localhost)"
        Core["127.0.0.1:3000<br/>hivecfm-core"]
        MB["127.0.0.1:3001<br/>Metabase"]
        Minio["127.0.0.1:9000<br/>MinIO S3"]
        SS["127.0.0.1:3002<br/>Superset"]
        N8N["127.0.0.1:5678<br/>n8n"]
        SF["127.0.0.1:3003<br/>Mock Salesforce"]
    end

    Client --> HTTP
    Client --> HTTPS443
    Client --> HTTPS3001
    Client --> HTTPS3002
    Client --> HTTPS5678
    Client --> HTTPSSF

    HTTP -->|301 redirect| HTTPS443
    HTTPS443 -->|/| Core
    HTTPS443 -->|/storage/| Minio
    HTTPS3001 --> MB
    HTTPS3002 --> SS
    HTTPS5678 --> N8N
    HTTPSSF --> SF
```

### 9.2. Upstream Definitions

The nginx configuration (`nginx/hivecfm.conf`) defines six upstream groups with keepalive connections:

| Upstream | Server | Keepalive |
|---|---|---|
| `hivecfm_core` | `127.0.0.1:3000` | 64 |
| `hivecfm_metabase` | `127.0.0.1:3001` | 32 |
| `hivecfm_minio` | `127.0.0.1:9000` | 32 |
| `hivecfm_superset` | `127.0.0.1:3002` | 32 |
| `hivecfm_n8n` | `127.0.0.1:5678` | 32 |
| `hivecfm_mock_salesforce` | `127.0.0.1:3003` | 32 |

### 9.3. Server Blocks

#### HTTP to HTTPS Redirect (Port 80)

All HTTP traffic is redirected to HTTPS with a 301 status, except for Let's Encrypt ACME challenge paths:

```nginx
location /.well-known/acme-challenge/ {
    root /var/www/html;
}

location / {
    return 301 https://$host$request_uri;
}
```

#### Main Application (Port 443 -- hivecfm.xcai.io)

- SSL with HTTP/2
- Certificates managed by Certbot (Let's Encrypt)
- OCSP stapling enabled
- Security headers: HSTS, X-Frame-Options (SAMEORIGIN), X-Content-Type-Options, Referrer-Policy
- Client upload limit: 100 MB
- WebSocket support (Upgrade/Connection headers)

**MinIO storage proxy (`/storage/`):**

The `/storage/` prefix is rewritten and proxied to MinIO for S3 API access and direct file access. Buffering is disabled for streaming uploads:

```nginx
location /storage/ {
    rewrite ^/storage/(.*) /$1 break;
    proxy_pass http://hivecfm_minio;
    proxy_buffering off;
    proxy_request_buffering off;
    client_max_body_size 100M;
}
```

**Nginx health check:**

```nginx
location /nginx-health {
    access_log off;
    return 200 "healthy\n";
}
```

#### Metabase (Port 3001 -- SSL)

Proxies to the Metabase container with SSL termination using the same certificate.

#### Superset (Port 3002 -- SSL)

Proxies to Apache Superset with SSL termination. The `X-Frame-Options` is set to `SAMEORIGIN` to allow embedded dashboard iframes within HiveCFM.

#### n8n Workflow Automation (Port 5678 -- SSL)

Proxies to n8n with WebSocket support for the real-time workflow editor.

#### Mock Salesforce (Port 443 -- salesforce.hivecfm.xcai.io)

Separate subdomain for the mock Salesforce CRM service.

### 9.4. Proxy Configuration

All server blocks share these proxy settings:

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 9.5. Initial Setup (Before SSL)

The `nginx/hivecfm-initial.conf` provides an HTTP-only configuration for the initial Certbot setup:

1. Copy `hivecfm-initial.conf` to `/etc/nginx/sites-available/hivecfm`
2. Create symlink: `ln -s /etc/nginx/sites-available/hivecfm /etc/nginx/sites-enabled/`
3. Remove default site: `rm /etc/nginx/sites-enabled/default`
4. Test and reload: `nginx -t && systemctl reload nginx`
5. Run Certbot: `certbot --nginx -d hivecfm.xcai.io`
6. Replace with `hivecfm.conf` for full SSL configuration

---

## 10. Backup and Recovery

### 10.1. Database Backup Strategy

```mermaid
graph TD
    subgraph "Backup Sources"
        PG["PostgreSQL<br/>hivecfm database"]
        Redis["Redis/Valkey<br/>AOF + RDB"]
        S3["MinIO/S3<br/>File uploads"]
    end

    subgraph "Backup Methods"
        PGDump["pg_dump<br/>Logical backup"]
        WAL["WAL Archiving<br/>Point-in-time recovery"]
        RedisRDB["Redis RDB<br/>Snapshot"]
        S3Sync["mc mirror / aws s3 sync<br/>File sync"]
    end

    subgraph "Storage"
        Local["Local filesystem"]
        Remote["Remote storage<br/>Azure Blob / S3"]
    end

    PG --> PGDump
    PG --> WAL
    Redis --> RedisRDB
    S3 --> S3Sync
    PGDump --> Local
    PGDump --> Remote
    WAL --> Remote
    RedisRDB --> Local
    S3Sync --> Remote
```

#### PostgreSQL Backup

**Docker Compose deployment -- automated pg_dump:**

```bash
#!/bin/bash
# /opt/hivecfm/backup.sh
BACKUP_DIR="/opt/hivecfm/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
docker exec hivecfm-postgres pg_dump \
  -U postgres \
  -d hivecfm \
  --format=custom \
  --compress=9 \
  > "${BACKUP_DIR}/hivecfm_${TIMESTAMP}.dump"

# Also backup Superset metadata
docker exec hivecfm-postgres pg_dump \
  -U postgres \
  -d superset_app \
  --format=custom \
  --compress=9 \
  > "${BACKUP_DIR}/superset_${TIMESTAMP}.dump"

# Retain last 30 days
find "${BACKUP_DIR}" -name "*.dump" -mtime +30 -delete
```

Schedule via cron:

```
0 2 * * * /opt/hivecfm/backup.sh >> /var/log/hivecfm-backup.log 2>&1
```

**Azure deployment:**

Azure Database for PostgreSQL Flexible Server provides automated backups:
- Automatic daily backups with configurable retention (7-35 days)
- Point-in-time restore (PITR) to any second within the retention period
- Geo-redundant backup storage (optional)

**Restore procedure:**

```bash
# From pg_dump custom format
docker exec -i hivecfm-postgres pg_restore \
  -U postgres \
  -d hivecfm \
  --clean \
  --if-exists \
  < hivecfm_20260313_020000.dump
```

#### Redis Backup

Valkey/Redis persists data via AOF (Append Only File). The data volume (`redis_data`) contains the AOF file. For explicit snapshots:

```bash
# Trigger RDB save
docker exec hivecfm-redis valkey-cli BGSAVE

# Copy RDB file
docker cp hivecfm-redis:/data/dump.rdb ./backups/redis_$(date +%Y%m%d).rdb
```

#### MinIO / S3 Backup

```bash
# Using MinIO client
mc mirror hivecfm/hivecfm-uploads ./backups/uploads/

# Using aws-cli for Azure Blob or AWS S3
aws s3 sync s3://hivecfm-uploads ./backups/uploads/
```

### 10.2. Disaster Recovery Checklist

1. Restore PostgreSQL from the most recent backup
2. Run Prisma migrations: `npx prisma migrate deploy`
3. Restore Redis data (or allow cache to rebuild)
4. Restore file uploads from S3/MinIO backup
5. Verify health endpoints: `GET /api/health` and `GET /api/ready`
6. Verify RLS policies are active (if applicable)

---

## 11. Health Checks

### 11.1. Endpoint Summary

| Endpoint | Purpose | Response | Used By |
|---|---|---|---|
| `GET /health` | Comprehensive health status | JSON with database + cache checks | Docker, monitoring |
| `GET /api/health` | Same as `/health` (Next.js route) | JSON with status, checks, timestamp | External monitoring |
| `GET /api/ready` | Readiness probe | `{ ready: true/false }` | Kubernetes, load balancers |
| `GET /api/v2/health` | API v2 health endpoint | Standard API v2 response format | API consumers |
| `GET /nginx-health` | Nginx process health | Plain text "healthy" | External load balancers |

### 11.2. Health Check Response Format

**`GET /api/health` -- Healthy (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": true,
      "cache": true
    },
    "timestamp": "2026-03-13T10:30:00.000Z"
  }
}
```

**`GET /api/health` -- Unhealthy (HTTP 503):**

```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "checks": {
      "database": true,
      "cache": false
    },
    "timestamp": "2026-03-13T10:30:00.000Z"
  }
}
```

### 11.3. Health Check Implementation

The `performHealthChecks()` function (`modules/api/v2/health/lib/health-checks.ts`) runs two checks in parallel:

1. **Database check** -- Executes `SELECT 1` via Prisma to verify PostgreSQL connectivity
2. **Cache check** -- Calls `isRedisAvailable()` on the cache service to verify Redis/Valkey connectivity

Both checks run concurrently via `Promise.all()`. Individual check failures are reported in the response but do not crash the health endpoint itself.

### 11.4. Readiness Probe Response

**`GET /api/ready` -- Ready (HTTP 200):**

```json
{
  "ready": true
}
```

**`GET /api/ready` -- Not Ready (HTTP 503):**

```json
{
  "ready": false,
  "reason": "database unavailable"
}
```

Possible reasons: `"database unavailable"`, `"cache unavailable"`, `"database and cache unavailable"`, `"health check failed"`.

### 11.5. Docker Compose Health Checks

| Service | Check Command | Interval | Timeout | Retries | Start Period |
|---|---|---|---|---|---|
| hivecfm-core | `curl -f http://localhost:3000/health` | 30s | 10s | 3 | 120s |
| postgres | `pg_isready -U postgres -d hivecfm` | 10s | 10s | 5 | 60s |
| redis | `valkey-cli ping` | 10s | 10s | 3 | 10s |
| minio | `mc ready local` | 10s | 10s | 3 | 30s |
| superset | `curl -f http://localhost:8088/health` | 30s | 10s | 5 | 120s |
| mock-salesforce | Node.js HTTP check on `/cases` | 30s | 10s | 3 | 30s |
| license-portal | `wget -qO- http://127.0.0.1:3101/api/auth/session` | 30s | 10s | 3 | 10s |

### 11.6. Kubernetes Health Probes

The Helm chart configures three probe types:

| Probe | Type | Check | Failure Threshold | Notes |
|---|---|---|---|---|
| Startup | TCP Socket on 3000 | Port open | 30 (= 300s max) | Allows time for DB migrations |
| Readiness | HTTP GET `/health` | HTTP 200 | 5 | Removes from service on failure |
| Liveness | HTTP GET `/health` | HTTP 200 | 5 | Restarts container on failure |

---

## 12. SSL/TLS Certificate Management

### 12.1. Docker Compose / Self-Hosted (Let's Encrypt + Certbot)

```mermaid
sequenceDiagram
    participant Certbot
    participant Nginx
    participant LE as Let's Encrypt CA

    Certbot->>Nginx: Place ACME challenge in /.well-known/
    LE->>Nginx: HTTP-01 validation request
    Nginx->>LE: Serve challenge token
    LE->>Certbot: Issue certificate
    Certbot->>Nginx: Write cert to /etc/letsencrypt/
    Certbot->>Nginx: Reload configuration

    Note over Certbot: Auto-renewal every 60 days<br/>via systemd timer or cron
```

**Certificate paths:**

| File | Path |
|---|---|
| Full chain | `/etc/letsencrypt/live/hivecfm.xcai.io/fullchain.pem` |
| Private key | `/etc/letsencrypt/live/hivecfm.xcai.io/privkey.pem` |
| SSL options | `/etc/letsencrypt/options-ssl-nginx.conf` |
| DH parameters | `/etc/letsencrypt/ssl-dhparams.pem` |

**Initial certificate acquisition:**

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Deploy initial nginx config (HTTP only)
cp nginx/hivecfm-initial.conf /etc/nginx/sites-available/hivecfm
ln -s /etc/nginx/sites-available/hivecfm /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Obtain certificate
certbot --nginx -d hivecfm.xcai.io -d salesforce.hivecfm.xcai.io

# Deploy full SSL config
cp nginx/hivecfm.conf /etc/nginx/sites-available/hivecfm
nginx -t && systemctl reload nginx
```

**Auto-renewal:**

Certbot installs a systemd timer (`certbot.timer`) or cron job that runs `certbot renew` twice daily. The `--nginx` plugin automatically reloads nginx after renewal.

**SSL security features configured in nginx:**

- TLS 1.2 and 1.3 only (via Certbot defaults)
- HSTS with `max-age=31536000; includeSubDomains`
- OCSP stapling with Google DNS resolvers (8.8.8.8, 8.8.4.4)
- Strong cipher suites (managed by Certbot)

### 12.2. Azure Container Apps (Managed Certificates)

Azure Container Apps provides fully managed TLS certificates:

1. Add custom domain to the Container App via Azure Portal or CLI
2. Azure validates domain ownership (CNAME or TXT record)
3. Certificate is automatically provisioned and bound
4. Auto-renewal handled by Azure (no manual intervention)

```bash
# Add custom domain via CLI
az containerapp hostname add \
  --name hivecfm-core \
  --resource-group rg-hivecfm \
  --hostname hivecfm.xcai.io

# Bind managed certificate
az containerapp hostname bind \
  --name hivecfm-core \
  --resource-group rg-hivecfm \
  --hostname hivecfm.xcai.io \
  --environment hivecfm-env \
  --validation-method CNAME
```

### 12.3. Kubernetes (cert-manager)

For Kubernetes deployments, use cert-manager with Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@hivecfm.xcai.io
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: hivecfm-tls
  namespace: hivecfm
spec:
  secretName: hivecfm-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - hivecfm.example.com
```

Reference the certificate in the Ingress:

```yaml
ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls:
    - secretName: hivecfm-tls
      hosts:
        - hivecfm.example.com
```

### 12.4. OpenShift (Route-based TLS)

OpenShift Routes handle TLS termination natively. For edge termination with auto-generated certificates:

```yaml
spec:
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

For custom certificates, provide them in the Route:

```yaml
spec:
  tls:
    termination: edge
    certificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      ...
      -----END RSA PRIVATE KEY-----
    caCertificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----
```

---

## Appendix A: Quick Start Commands

### Local Development

```bash
# Start infrastructure
pnpm db:up

# Run application
pnpm dev

# Open browser
open http://localhost:3000
```

### Docker Compose (Self-Hosted)

```bash
# Copy and configure environment
cp .env.hivecfm.example .env
# Edit .env with your values

# Build and start
docker compose up -d --build

# Production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker compose logs -f hivecfm-core
```

### Kubernetes / Helm

```bash
# Build dependencies
helm dependency build ./helm-chart

# Install
helm install hivecfm ./helm-chart \
  --namespace hivecfm \
  --create-namespace \
  --set deployment.image.repository=hivecfmregistry.azurecr.io/hivecfm-core \
  --set deployment.image.tag=latest

# Verify
kubectl get pods -n hivecfm
kubectl get hpa -n hivecfm
```

## Appendix B: Port Reference

| Service | Internal Port | External Port | Protocol |
|---|---|---|---|
| hivecfm-core | 3000 | 443 (nginx) | HTTPS |
| license-portal | 3101 | 3101 | HTTPS |
| PostgreSQL | 5432 | -- (internal) | TCP |
| Redis/Valkey | 6379 | -- (internal) | TCP |
| MinIO S3 API | 9000 | 443/storage (nginx) | HTTPS |
| MinIO Console | 9001 | 9001 | HTTP |
| Metabase | 3001 | 3001 (nginx) | HTTPS |
| Superset | 8088 | 3002 (nginx) | HTTPS |
| n8n | 5678 | 5678 (nginx) | HTTPS |
| Mock Salesforce | 3000 | 443 (nginx) | HTTPS |
| Mailhog SMTP | 1025 | 1025 | SMTP |
| Mailhog UI | 8025 | 8025 | HTTP |
| Prometheus metrics | 9464 | 9464 | HTTP |
