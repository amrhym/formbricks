# HiveCFM Production Deployment Guide

This guide covers the complete deployment process for HiveCFM to a production server.

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 8 GB | 16 GB |
| Disk | 50 GB | 100 GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 22.04 LTS |

### Required Software

- Docker Engine 24.x or later
- Docker Compose v2.20+
- Git

## Initial Server Setup

### Step 1: SSH into Production Server

```bash
ssh user@54.227.68.111
```

### Step 2: Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version

# Logout and login again for group changes
exit
ssh user@54.227.68.111
```

### Step 3: Verify System Resources

```bash
# Check disk space (need 50GB+ free)
df -h

# Check memory (need 8GB+ total)
free -h

# Check CPU cores (need 2+ cores)
nproc
```

### Step 4: Create Deployment Directory

```bash
sudo mkdir -p /opt/hivecfm
sudo chown $USER:$USER /opt/hivecfm
cd /opt/hivecfm
```

## Repository Setup

### Step 5: Clone Repositories

```bash
cd /opt/hivecfm

# Clone main application repository
git clone https://github.com/your-org/hivecfm-core.git
cd hivecfm-core
git checkout hivecfm-main

# Clone Metabase repository (adjacent to hivecfm-core)
cd /opt/hivecfm
git clone https://github.com/your-org/hivecfm-metabase.git
cd hivecfm-metabase
git checkout hivecfm-main

# Clone Superset repository (adjacent to hivecfm-core)
cd /opt/hivecfm
git clone https://github.com/your-org/hivecfm-superset-hub.git
cd hivecfm-superset-hub
git checkout main
```

### Directory Structure

After cloning, your directory should look like:

```
/opt/hivecfm/
├── hivecfm-core/              # Main application
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── scripts/
│   │   ├── deploy.sh
│   │   └── init-db.sh
│   └── apps/web/Dockerfile
├── hivecfm-metabase/          # Metabase analytics
│   └── Dockerfile
└── hivecfm-superset-hub/      # Superset analytics
    └── Dockerfile
```

## Environment Configuration

### Step 6: Configure Environment Variables

```bash
cd /opt/hivecfm/hivecfm-core

# Copy environment template
cp .env.example .env

# Generate secure secrets
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)" >> .env.secrets
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.secrets
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.secrets
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env.secrets
echo "METABASE_SECRET_KEY=$(openssl rand -hex 32)" >> .env.secrets
echo "SUPERSET_SECRET_KEY=$(openssl rand -hex 32)" >> .env.secrets
echo "METABASE_DB_PASSWORD=$(openssl rand -hex 16)" >> .env.secrets
echo "SUPERSET_DB_PASSWORD=$(openssl rand -hex 16)" >> .env.secrets

# View generated secrets and copy to .env
cat .env.secrets
```

### Step 7: Edit .env File

```bash
# Edit .env file with your values
nano .env
```

**Required Configuration:**

```bash
# Application URLs
WEBAPP_URL=https://hivecfm.xcai.io
NEXTAUTH_URL=https://hivecfm.xcai.io

# Database
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@postgres:5432/hivecfm?schema=public
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD

# Secrets (from .env.secrets)
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET
ENCRYPTION_KEY=YOUR_GENERATED_KEY
CRON_SECRET=YOUR_GENERATED_SECRET

# Analytics
METABASE_SECRET_KEY=YOUR_GENERATED_KEY
METABASE_URL=http://localhost:3001
METABASE_DB_PASSWORD=YOUR_GENERATED_PASSWORD

SUPERSET_SECRET_KEY=YOUR_GENERATED_KEY
SUPERSET_DB_PASSWORD=YOUR_GENERATED_PASSWORD

# Email (optional for MVP)
MAIL_FROM=noreply@hivecfm.xcai.io
MAIL_FROM_NAME=HiveCFM
EMAIL_VERIFICATION_DISABLED=1
PASSWORD_RESET_DISABLED=1
```

### Step 8: Secure Environment File

```bash
# Set restrictive permissions
chmod 600 .env
chmod 600 .env.secrets

# Verify permissions
ls -la .env
```

## Build and Deploy

### Step 9: Build Docker Images

```bash
cd /opt/hivecfm/hivecfm-core

# Build all images (this may take 15-30 minutes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Or build in parallel for faster builds
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --parallel
```

### Step 10: Start Services

```bash
# Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor startup logs
docker compose logs -f

# Wait for health checks (Ctrl+C to exit logs)
```

### Step 11: Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Check container health status
docker inspect --format='{{.State.Health.Status}}' hivecfm-core
docker inspect --format='{{.State.Health.Status}}' hivecfm-postgres
docker inspect --format='{{.State.Health.Status}}' hivecfm-redis
docker inspect --format='{{.State.Health.Status}}' hivecfm-metabase
docker inspect --format='{{.State.Health.Status}}' hivecfm-superset

# Test health endpoints
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3002/health
```

## Verification Checklist

### Database Initialization

```bash
# Check PostgreSQL logs for init-db.sh execution
docker compose logs postgres | grep -i "hivecfm"

# Connect to database and verify
docker exec -it hivecfm-postgres psql -U postgres -d hivecfm -c "\dt"

# Verify metabase_app database exists
docker exec -it hivecfm-postgres psql -U postgres -c "\l" | grep metabase_app

# Verify users were created
docker exec -it hivecfm-postgres psql -U postgres -c "\du" | grep -E "metabase|superset"
```

### Data Persistence Test

```bash
# Create test data
docker exec -it hivecfm-postgres psql -U postgres -d hivecfm -c "CREATE TABLE test_persistence (id serial PRIMARY KEY, data text);"
docker exec -it hivecfm-postgres psql -U postgres -d hivecfm -c "INSERT INTO test_persistence (data) VALUES ('test data');"

# Restart postgres container
docker compose restart postgres

# Wait for healthy status
sleep 30

# Verify data persists
docker exec -it hivecfm-postgres psql -U postgres -d hivecfm -c "SELECT * FROM test_persistence;"

# Cleanup test data
docker exec -it hivecfm-postgres psql -U postgres -d hivecfm -c "DROP TABLE test_persistence;"
```

### Auto-Restart Test

```bash
# Force kill a container
docker kill hivecfm-redis

# Wait and verify auto-restart
sleep 10
docker compose ps | grep redis

# Should show running status
```

## Using the Deployment Script

After initial setup, use the deployment script for updates:

```bash
cd /opt/hivecfm/hivecfm-core

# Full deployment (pull, build, restart)
./scripts/deploy.sh

# Only pull latest code
./scripts/deploy.sh --pull

# Only build images
./scripts/deploy.sh --build

# Only restart services
./scripts/deploy.sh --restart

# Show service status
./scripts/deploy.sh --status

# View logs
./scripts/deploy.sh --logs
```

### SSH-based Remote Deployment

From your local machine:

```bash
ssh user@54.227.68.111 "cd /opt/hivecfm/hivecfm-core && ./scripts/deploy.sh"
```

## Maintenance Commands

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f hivecfm-core
docker compose logs -f postgres
docker compose logs -f metabase

# Last 100 lines
docker compose logs --tail=100 hivecfm-core
```

### Restarting Services

```bash
# Restart single service
docker compose restart hivecfm-core

# Restart all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart
```

### Stopping Services

```bash
# Stop all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Stop and remove volumes (CAUTION: data loss)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

## Backup and Restore

### Database Backup

```bash
# Create backup
docker exec hivecfm-postgres pg_dump -U postgres hivecfm > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
docker exec hivecfm-postgres pg_dump -U postgres hivecfm | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore

```bash
# Restore from backup
cat backup_20260110.sql | docker exec -i hivecfm-postgres psql -U postgres -d hivecfm

# Restore from compressed backup
gunzip -c backup_20260110.sql.gz | docker exec -i hivecfm-postgres psql -U postgres -d hivecfm
```

### Volume Backup

```bash
# Backup postgres data volume
docker run --rm -v hivecfm-postgres-data:/data -v $(pwd):/backup alpine tar cvf /backup/postgres-volume-$(date +%Y%m%d).tar /data
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose logs hivecfm-core

# Check container exit code
docker inspect --format='{{.State.ExitCode}}' hivecfm-core
```

### Database Connection Issues

```bash
# Verify postgres is running
docker compose ps postgres

# Test connection
docker exec -it hivecfm-postgres psql -U postgres -c "SELECT 1"

# Check DATABASE_URL in .env
grep DATABASE_URL .env
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3002

# Kill the process or change ports in docker-compose.yml
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a
```

## Security Notes

1. **Firewall Configuration**: Ensure only necessary ports are open (3000, 3001, 3002 for MVP, 80/443 after nginx setup)

2. **SSH Key Authentication**: Use SSH keys instead of passwords

3. **Environment Secrets**: Keep .env and .env.secrets with 600 permissions

4. **Regular Updates**: Keep Docker and system packages updated

5. **Backups**: Implement daily database backups

## Health Check Endpoints

HiveCFM provides multiple health check endpoints for monitoring and orchestration:

### Available Endpoints

| Endpoint | Purpose | Response Format | HTTP Status |
|----------|---------|-----------------|-------------|
| `/health` | Simple liveness probe (Docker) | `{"status":"ok"}` | 200 |
| `/api/health` | Detailed health status | `{success, data: {status, checks, timestamp}}` | 200/503 |
| `/api/ready` | Readiness probe (Kubernetes) | `{ready: true/false}` | 200/503 |
| `/api/v2/health` | Legacy detailed health | `{data: {main_database, cache_database}}` | 200/503 |

### `/api/health` - Detailed Health Status

Returns comprehensive health information with database and cache status:

**Healthy Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": true,
      "cache": true
    },
    "timestamp": "2026-01-11T20:00:00.000Z"
  }
}
```

**Unhealthy Response (HTTP 503):**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "checks": {
      "database": false,
      "cache": true
    },
    "timestamp": "2026-01-11T20:00:00.000Z"
  }
}
```

### `/api/ready` - Readiness Probe

Returns simple ready status for load balancer health checks and Kubernetes readiness probes:

**Ready Response (HTTP 200):**
```json
{
  "ready": true
}
```

**Not Ready Response (HTTP 503):**
```json
{
  "ready": false,
  "reason": "database unavailable"
}
```

### Monitoring Recommendations

1. **Docker HEALTHCHECK**: Uses `/health` endpoint (already configured in docker-compose.yml)
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

2. **Kubernetes Probes**: Use `/api/ready` for readiness and `/health` for liveness
   ```yaml
   livenessProbe:
     httpGet:
       path: /health
       port: 3000
     initialDelaySeconds: 120
     periodSeconds: 30
   readinessProbe:
     httpGet:
       path: /api/ready
       port: 3000
     initialDelaySeconds: 10
     periodSeconds: 10
   ```

3. **External Monitoring**: Use `/api/health` for detailed status in monitoring dashboards
   - Alerts on HTTP 503 responses
   - Track individual component health (database, cache)
   - Monitor timestamp for freshness

4. **nginx Health Check**: `/nginx-health` endpoint for nginx-level health (if configured)

### Testing Health Endpoints

```bash
# Simple liveness check (Docker)
curl http://localhost:3000/health

# Detailed health status
curl http://localhost:3000/api/health

# Readiness probe
curl http://localhost:3000/api/ready

# Legacy V2 health
curl http://localhost:3000/api/v2/health
```

## Next Steps

After completing this deployment:

1. Configure DNS to point hivecfm.xcai.io to server IP
2. Set up external monitoring using `/api/health` endpoint
3. Configure alerting for unhealthy status responses
