# HiveCFM Local Deployment Guide

Deploy HiveCFM on any machine with Docker in under 5 minutes. No license keys or manual configuration required.

## Prerequisites

- Docker & Docker Compose (v2+)
- Git access to the repository
- Minimum 4GB RAM, 2 CPU cores

## Step 1: Clone the Repository

```bash
git clone https://github.com/amrhym/formbricks.git hivecfm
cd hivecfm
git checkout hivecfm-main
```

## Step 2: Create Environment File

Create a `.env` file in the project root:

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
EOF
```

## Step 3: Start All Services

```bash
docker compose -f docker-compose.yml up -d
```

This starts:
- **PostgreSQL** — database
- **Redis** — caching and queues
- **MinIO** — file storage (S3-compatible)
- **HiveCFM** — the application

## Step 4: Wait for Startup

First run takes ~2 minutes (database migrations + build).

```bash
docker compose logs -f hivecfm-core
```

Wait until you see:
```
✓ Ready in XXXms
```

Press `Ctrl+C` to exit the log viewer.

## Step 5: Access the Application

Open **http://localhost:3000** in your browser.

1. **Create your account** — first user becomes the admin
2. **Create an organization** — a trial license is automatically created:
   - 5 users
   - 500 responses
   - 7 days validity
   - All addons enabled (AI Insights, Campaign Management)
3. **Start building surveys**

No license keys, PEM files, or manual activation needed.

## Common Operations

### Stop Services

```bash
docker compose down
```

### Restart Services (data preserved)

```bash
docker compose up -d
```

### View Logs

```bash
# All services
docker compose logs -f

# Only HiveCFM app
docker compose logs -f hivecfm-core

# Only database
docker compose logs -f postgres
```

### Full Reset (delete all data)

```bash
docker compose down -v
```

### Rebuild After Code Changes

```bash
docker compose -f docker-compose.yml build hivecfm-core
docker compose up -d hivecfm-core
```

## Optional: Configure Email (SMTP)

To enable email features (password reset, follow-ups), add to `.env`:

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

```bash
AZUREAD_CLIENT_ID=your-client-id
AZUREAD_CLIENT_SECRET=your-client-secret
AZUREAD_TENANT_ID=your-tenant-id
```

## Optional: Configure Superset Analytics

```bash
SUPERSET_BASE_URL=http://hivecfm-superset:8088
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=your-superset-password
SUPERSET_DB_URL=postgresql://superset:your-password@postgres:5432/superset_app
NEXT_PUBLIC_SUPERSET_BASE_URL=http://localhost:3002
```

## Production Deployment Notes

For production, change these values:

| Variable | Local | Production |
|----------|-------|------------|
| `WEBAPP_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | any string | Generate: `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | any string | Generate: `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `postgres` | Generate: `openssl rand -hex 16` |
| `S3_SECRET_KEY` | `hivecfm-local-secret` | Generate: `openssl rand -hex 16` |
| `EMAIL_VERIFICATION_DISABLED` | `1` | `0` |

## Troubleshooting

### "License has no signature" error

This should not happen with the latest code. If it does:
- Ensure you're on the latest `hivecfm-main` branch
- Run `docker compose down -v && docker compose up -d` for a clean start

### Database migration errors

```bash
# Force re-run migrations
docker compose exec hivecfm-core npx prisma migrate deploy
```

### Port conflicts

If port 3000 is in use, change in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### MinIO bucket not created

```bash
docker compose exec minio mc alias set local http://localhost:9000 hivecfm hivecfm-local-secret
docker compose exec minio mc mb local/hivecfm-uploads --ignore-existing
```
