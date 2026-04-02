# HiveCFM Local Deployment Guide

Deploy HiveCFM with Hub (semantic search + AI enrichment) on any machine with Docker in under 5 minutes. No license keys or manual configuration required.

## Prerequisites

- Docker & Docker Compose (v2+)
- Git access to the repositories
- Minimum 4GB RAM, 2 CPU cores

## Step 1: Clone Both Repositories

First, configure Git for large repos (prevents transfer errors with Azure DevOps):

```bash
git config --global http.postBuffer 524288000
git config --global http.version HTTP/1.1
```

Then clone:

```bash
mkdir hivecfm && cd hivecfm

# Core application
git clone https://istnetworksrnd@dev.azure.com/istnetworksrnd/HiveCFM/_git/hivecfm-core
cd hivecfm-core && git checkout hivecfm-main && cd ..

# Hub (semantic search + AI enrichment)
git clone https://istnetworksrnd@dev.azure.com/istnetworksrnd/HiveCFM/_git/hivecfm-hub
```

> **If clone fails** with `HTTP/2 stream was not closed cleanly`, try shallow clone:
> ```bash
> git clone --depth 1 https://istnetworksrnd@dev.azure.com/istnetworksrnd/HiveCFM/_git/hivecfm-core
> cd hivecfm-core && git fetch --unshallow && cd ..
> ```

## Step 2: Create Environment File

Create `.env` in the `hivecfm-core` directory:

```bash
cat > hivecfm-core/.env << 'EOF'
# =============================================================================
# HiveCFM Local Environment Configuration
# =============================================================================

# ---- Database ----
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hivecfm?schema=public
POSTGRES_PASSWORD=postgres

# ---- Redis ----
REDIS_URL=redis://redis:6379

# ---- Application ----
WEBAPP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-in-production-min32chars
ENCRYPTION_KEY=local-dev-encryption-key-change-in-production-must-be-64-hex-chars

# ---- Email (disabled for local) ----
EMAIL_VERIFICATION_DISABLED=1
PASSWORD_RESET_DISABLED=1

# ---- Enterprise Features ----
ENTERPRISE_LICENSE_KEY=hivecfm-enterprise-enabled
IS_FORMBRICKS_CLOUD=0
TELEMETRY_DISABLED=1
SIGNUP_DISABLED=0

# ---- MinIO Storage ----
S3_ACCESS_KEY=hivecfm
S3_SECRET_KEY=hivecfm-local-secret
S3_BUCKET_NAME=hivecfm-uploads
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=1
S3_INTERNAL_ENDPOINT=http://minio:9000
S3_ENDPOINT_URL=http://localhost:9000
MINIO_ROOT_USER=hivecfm
MINIO_ROOT_PASSWORD=hivecfm-local-secret

# ---- HiveCFM Hub ----
HIVECFM_HUB_URL=http://hivecfm-hub-api:8080
HIVECFM_HUB_API_KEY=hivecfm-hub-secret-key
EOF
```

## Step 3: Create Hub Environment File

Create `.env` in the `hivecfm-hub` directory:

```bash
cat > hivecfm-hub/.env << 'EOF'
HUB_API_KEY=hivecfm-hub-secret-key
POSTGRES_PASSWORD=postgres
EOF
```

## Step 4: Create Docker Network

Both services share a network:

```bash
docker network create hivecfm-network 2>/dev/null || true
```

## Step 5: Start Core Services

```bash
cd hivecfm-core
docker compose -f docker-compose.yml up -d
```

This starts: PostgreSQL, Redis, MinIO, and HiveCFM Core.

Wait for startup (~2 min first time):
```bash
docker compose logs -f hivecfm-core
# Wait for: ✓ Ready in XXXms
# Press Ctrl+C to exit
```

## Step 6: Create Hub Database

The Hub uses a separate database on the same PostgreSQL instance:

```bash
docker exec hivecfm-postgres psql -U postgres -c "CREATE DATABASE hivecfm_hub;" 2>/dev/null || true
```

## Step 7: Start Hub Services

```bash
cd ../hivecfm-hub
docker compose -f docker-compose.prod.yml up -d
```

This starts:
- **hivecfm-hub-api** — Go API server (semantic search, AI enrichment, feedback ingestion)
- **hivecfm-hub-riverui** — Background job monitoring UI

Verify Hub is running:
```bash
curl -s http://localhost:8090/health
# Expected: {"status":"ok"}
```

## Step 8: Access the Application

Open **http://localhost:3000** in your browser.

1. **Create your account** — first user becomes admin
2. **Create an organization** — trial license auto-created:
   - 5 users, 500 responses, 7 days, all addons enabled
3. **Configure Hub integration** — go to Settings > Integrations > HiveCFM Hub:
   - URL: `http://hivecfm-hub-api:8080`
   - API Key: `hivecfm-hub-secret-key`
4. **Start building surveys**

No license keys, PEM files, or manual activation needed.

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| HiveCFM Core | http://localhost:3000 | Main application |
| MinIO Console | http://localhost:9001 | File storage admin |
| Hub API | http://localhost:8090 | Semantic search API |
| River UI | http://localhost:8091 | Hub job monitoring |

## Common Operations

### Stop All Services

```bash
cd hivecfm-core && docker compose down
cd ../hivecfm-hub && docker compose -f docker-compose.prod.yml down
```

### Restart All Services

```bash
cd hivecfm-core && docker compose up -d
cd ../hivecfm-hub && docker compose -f docker-compose.prod.yml up -d
```

### View Logs

```bash
# Core app
docker logs -f hivecfm-core

# Hub API
docker logs -f hivecfm-hub-api

# All services
docker compose -f hivecfm-core/docker-compose.yml logs -f
```

### Full Reset (delete all data)

```bash
cd hivecfm-hub && docker compose -f docker-compose.prod.yml down
cd ../hivecfm-core && docker compose down -v
docker network rm hivecfm-network
```

### Rebuild After Code Changes

```bash
# Core
cd hivecfm-core
docker compose -f docker-compose.yml build hivecfm-core
docker compose up -d hivecfm-core

# Hub
cd ../hivecfm-hub
docker compose -f docker-compose.prod.yml build hub-api
docker compose -f docker-compose.prod.yml up -d hub-api
```

## Optional: Configure AI Features

### Google TTS (Voice Survey Audio Generation)

Go to Settings > Integrations > Google AI (TTS):
- Enter your Google Cloud API key (with Text-to-Speech API enabled)

### LLM (AI Translation, AI Insights)

Go to Settings > Integrations > LLM:
- Provider: Azure OpenAI or OpenAI
- Enter API key and endpoint

### Hub AI Enrichment (Sentiment Analysis, Embeddings)

Add to `hivecfm-hub/.env`:
```bash
EMBEDDING_PROVIDER=openai
EMBEDDING_PROVIDER_API_KEY=sk-your-openai-key
EMBEDDING_MODEL=text-embedding-3-small
```

Restart Hub after adding:
```bash
cd hivecfm-hub
docker compose -f docker-compose.prod.yml up -d hub-api
```

## Optional: Configure Email (SMTP)

Add to `hivecfm-core/.env`:

```bash
MAIL_FROM=noreply@yourdomain.com
MAIL_FROM_NAME=HiveCFM
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE_ENABLED=0
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_AUTHENTICATED=1
EMAIL_VERIFICATION_DISABLED=0
PASSWORD_RESET_DISABLED=0
```

## Optional: Configure Azure AD SSO

Add to `hivecfm-core/.env`:

```bash
AZUREAD_CLIENT_ID=your-client-id
AZUREAD_CLIENT_SECRET=your-client-secret
AZUREAD_TENANT_ID=your-tenant-id
```

## Optional: Configure Superset Analytics

Superset is included in the core docker-compose. Add to `hivecfm-core/.env`:

```bash
SUPERSET_BASE_URL=http://hivecfm-superset:8088
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=your-superset-password
SUPERSET_DB_URL=postgresql://superset:your-password@postgres:5432/superset_app
SUPERSET_SECRET_KEY=your-secret-key
NEXT_PUBLIC_SUPERSET_BASE_URL=http://localhost:3002
```

## Production Deployment Notes

For production, change these values:

| Variable | Local | Production |
|----------|-------|------------|
| `WEBAPP_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | any string | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | any string | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `postgres` | `openssl rand -hex 16` |
| `S3_SECRET_KEY` | `hivecfm-local-secret` | `openssl rand -hex 16` |
| `HUB_API_KEY` | `hivecfm-hub-secret-key` | `openssl rand -hex 32` |
| `EMAIL_VERIFICATION_DISABLED` | `1` | `0` |

## Troubleshooting

### "License has no signature" error
- Ensure you're on the latest `hivecfm-main` branch
- Run `docker compose down -v && docker compose up -d` for a clean start

### Database migration errors
```bash
docker exec hivecfm-core npx prisma migrate deploy
```

### Hub "connection refused"
- Ensure the `hivecfm-network` Docker network exists
- Ensure Hub containers are on the same network:
  ```bash
  docker network inspect hivecfm-network
  ```

### Port conflicts
Change ports in the respective `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Core: change 3001 to available port
  - "8092:8080"  # Hub: change 8092 to available port
```

### MinIO bucket not created
```bash
docker exec hivecfm-minio mc alias set local http://localhost:9000 hivecfm hivecfm-local-secret
docker exec hivecfm-minio mc mb local/hivecfm-uploads --ignore-existing
```

## Architecture

```
                    ┌──────────────────┐
                    │   Browser/App    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  HiveCFM Core    │ :3000
                    │  (Next.js)       │
                    └──┬─────┬────┬────┘
                       │     │    │
            ┌──────────▼┐ ┌──▼──┐ ┌▼──────────┐
            │ PostgreSQL │ │Redis│ │   MinIO    │
            │  :5432     │ │:6379│ │  :9000     │
            └──────┬─────┘ └─────┘ └───────────┘
                   │
            ┌──────▼─────────┐
            │  HiveCFM Hub   │ :8090
            │  (Go API)      │
            └────────────────┘
```
