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

```bash
cd hivecfm-core
```

Create `.env`:

```bash
cat > .env << 'EOF'
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

```bash
cd ../hivecfm-hub
```

Create `.env`:

```bash
cat > .env << 'EOF'
HUB_API_KEY=hivecfm-hub-secret-key
POSTGRES_PASSWORD=postgres
EOF
```

## Step 4: Start Core Services

```bash
cd ../hivecfm-core
docker compose up -d
```

> **Note:** Docker Compose automatically creates the `hivecfm-network`. Do NOT create it manually with `docker network create` — this causes label mismatches.

This starts: PostgreSQL, Redis, MinIO, and HiveCFM Core.

Wait for startup (~2 min first time):
```bash
docker compose logs -f hivecfm-core
# Wait for: ✓ Ready in XXXms
# Press Ctrl+C to exit
```

## Step 5: Create Hub Database

The Hub uses a separate database on the same PostgreSQL instance:

```bash
docker exec hivecfm-postgres psql -U postgres -c "CREATE DATABASE hivecfm_hub;" 2>/dev/null || true
```

## Step 6: Start Hub Services

```bash
cd ../hivecfm-hub
docker compose up -d
```

This starts:
- **hivecfm-hub-api** — Go API server (semantic search, AI enrichment, feedback ingestion)
- **hivecfm-hub-riverui** — Background job monitoring UI

Verify Hub is running:
```bash
curl -s http://localhost:8090/health
# Expected: {"status":"ok"}
```

## Step 7: Access the Application

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
| Grafana | http://localhost:3003 | Centralized logs (optional) |

## Common Operations

### Stop All Services

```bash
cd hivecfm-core && docker compose down
cd ../hivecfm-hub && docker compose down
```

### Restart All Services

```bash
cd hivecfm-core && docker compose up -d
cd ../hivecfm-hub && docker compose up -d
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
cd hivecfm-hub && docker compose down -v
cd ../hivecfm-core && docker compose down -v
```

### Rebuild After Code Changes

```bash
# Core
cd hivecfm-core
docker compose build hivecfm-core
docker compose up -d hivecfm-core

# Hub
cd ../hivecfm-hub
docker compose build hub-api
docker compose up -d hub-api
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
docker compose up -d hub-api
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

### Network label mismatch error
If you see `network hivecfm-network was found but has incorrect label`:
```bash
# Stop everything, remove network, restart (compose recreates it correctly)
cd hivecfm-hub && docker compose down
cd ../hivecfm-core && docker compose down
docker network rm hivecfm-network
cd hivecfm-core && docker compose up -d
cd ../hivecfm-hub && docker compose up -d
```
> **Important:** Never create the network manually with `docker network create`. Let Docker Compose manage it.

### Hub "connection refused"
- Ensure Hub containers are on the same network as Core:
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

## Centralized Logging (Grafana + Loki)

Centralized log aggregation across all HiveCFM services. Search logs from a single web UI instead of checking each container separately.

### Deploy Logging Stack

Create the monitoring directory and configs:

```bash
mkdir -p monitoring/{loki,promtail,grafana/provisioning/datasources}
```

**Loki config** (`monitoring/loki/loki-config.yml`):

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 30d
  max_query_length: 721h

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  delete_request_store: filesystem
```

**Promtail config** (`monitoring/promtail/promtail-config.yml`):

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
```

**Grafana datasource** (`monitoring/grafana/provisioning/datasources/loki.yml`):

```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
```

**Docker Compose** (`monitoring/docker-compose.yml`):

```yaml
services:
  loki:
    image: grafana/loki:3.0.0
    container_name: hivecfm-loki
    restart: unless-stopped
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - hivecfm-network

  promtail:
    image: grafana/promtail:3.0.0
    container_name: hivecfm-promtail
    restart: unless-stopped
    volumes:
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    depends_on:
      - loki
    networks:
      - hivecfm-network

  grafana:
    image: grafana/grafana:11.0.0
    container_name: hivecfm-grafana
    restart: unless-stopped
    ports:
      - '3003:3000'
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: hivecfm-grafana-2026
      GF_USERS_ALLOW_SIGN_UP: 'false'
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    depends_on:
      - loki
    networks:
      - hivecfm-network

volumes:
  loki-data:
  grafana-data:

networks:
  hivecfm-network:
    external: true
```

### Start Logging Stack

```bash
cd monitoring
docker compose up -d
```

### Access Grafana

| Field | Value |
|-------|-------|
| **URL** | http://localhost:3003 (local) or https://grafana.your-domain.com (production) |
| **Username** | `admin` |
| **Password** | `hivecfm-grafana-2026` |

### Search Logs

1. Open Grafana > **Explore** (compass icon)
2. Select **Loki** datasource
3. Use LogQL queries:

| Query | What it shows |
|-------|---------------|
| `{container="hivecfm-core"}` | All app logs |
| `{container="hivecfm-hub-api"}` | Hub API logs |
| `{container="hivecfm-postgres"}` | Database logs |
| `{container=~".+"}` | All containers |
| `{container="hivecfm-core"} \|= "error"` | App errors only |
| `{container=~".+"} \|= "error" \|!= "tsconfig"` | All errors (excluding noise) |
| `{container="hivecfm-core"} \| json \| level="error"` | Structured error logs |

### Log Retention

- Default: **30 days** (configured in `loki-config.yml`)
- Storage: ~50MB per day typical
- Change retention: edit `retention_period` in Loki config

### Production: Nginx Proxy for Grafana

For production deployments, add an nginx site:

```nginx
server {
    listen 443 ssl;
    server_name grafana.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/grafana.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grafana.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then generate SSL: `sudo certbot certonly --nginx -d grafana.your-domain.com`

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
            ┌──────▼─────────┐    ┌──────────────────┐
            │  HiveCFM Hub   │    │  Monitoring       │
            │  (Go API)      │    │  Grafana  :3003   │
            │  :8090         │    │  Loki     (internal)│
            └────────────────┘    │  Promtail (internal)│
                                  └──────────────────┘
```
