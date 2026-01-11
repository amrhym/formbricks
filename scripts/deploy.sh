#!/bin/bash
# ============================================================================
# HiveCFM Production Deployment Script
# ============================================================================
#
# Usage:
#   ./scripts/deploy.sh           - Full deployment (pull, build, restart)
#   ./scripts/deploy.sh --pull    - Only pull latest code
#   ./scripts/deploy.sh --build   - Only build images
#   ./scripts/deploy.sh --restart - Only restart services
#   ./scripts/deploy.sh --status  - Show service status
#   ./scripts/deploy.sh --logs    - Show service logs
#   ./scripts/deploy.sh --help    - Show this help message
#
# Environment Variables:
#   DEPLOY_DIR      - Deployment directory (default: /opt/hivecfm)
#   SKIP_BUILD      - Skip image build step (default: false)
#   SKIP_CLEANUP    - Skip old image cleanup (default: false)
#   HEALTH_TIMEOUT  - Health check timeout in seconds (default: 300)
#
# ============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/hivecfm}"
CORE_DIR="$DEPLOY_DIR/hivecfm-core"
METABASE_DIR="$DEPLOY_DIR/hivecfm-metabase"
SUPERSET_DIR="$DEPLOY_DIR/hivecfm-superset-hub"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_CLEANUP="${SKIP_CLEANUP:-false}"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show help message
show_help() {
    head -25 "$0" | tail -20
    exit 0
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 is not installed"
        exit 1
    fi

    # Check deployment directory
    if [ ! -d "$CORE_DIR" ]; then
        log_error "Core directory not found: $CORE_DIR"
        exit 1
    fi

    # Check docker-compose files
    if [ ! -f "$CORE_DIR/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in $CORE_DIR"
        exit 1
    fi

    if [ ! -f "$CORE_DIR/docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml not found in $CORE_DIR"
        exit 1
    fi

    # Check .env file
    if [ ! -f "$CORE_DIR/.env" ]; then
        log_error ".env file not found in $CORE_DIR"
        log_error "Copy .env.example to .env and configure it first"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pull latest code from all repositories
pull_code() {
    log_info "Pulling latest code from repositories..."

    # Pull hivecfm-core
    if [ -d "$CORE_DIR/.git" ]; then
        log_info "Pulling hivecfm-core..."
        cd "$CORE_DIR"
        git fetch origin
        git pull origin hivecfm-main || git pull origin main
        log_success "hivecfm-core updated"
    else
        log_warn "hivecfm-core is not a git repository, skipping pull"
    fi

    # Pull hivecfm-metabase
    if [ -d "$METABASE_DIR/.git" ]; then
        log_info "Pulling hivecfm-metabase..."
        cd "$METABASE_DIR"
        git fetch origin
        git pull origin hivecfm-main || git pull origin main
        log_success "hivecfm-metabase updated"
    else
        log_warn "hivecfm-metabase is not a git repository or not found, skipping pull"
    fi

    # Pull hivecfm-superset-hub
    if [ -d "$SUPERSET_DIR/.git" ]; then
        log_info "Pulling hivecfm-superset-hub..."
        cd "$SUPERSET_DIR"
        git fetch origin
        git pull origin main || git pull origin hivecfm-main
        log_success "hivecfm-superset-hub updated"
    else
        log_warn "hivecfm-superset-hub is not a git repository or not found, skipping pull"
    fi

    cd "$CORE_DIR"
    log_success "Code pull completed"
}

# Build Docker images
build_images() {
    if [ "$SKIP_BUILD" = "true" ]; then
        log_warn "Skipping image build (SKIP_BUILD=true)"
        return
    fi

    log_info "Building Docker images..."
    cd "$CORE_DIR"

    # Build with production overlay
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build --parallel

    log_success "Docker images built successfully"
}

# Stop existing services
stop_services() {
    log_info "Stopping existing services..."
    cd "$CORE_DIR"

    # Graceful shutdown with timeout
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down --timeout 30

    log_success "Services stopped"
}

# Start services
start_services() {
    log_info "Starting services..."
    cd "$CORE_DIR"

    # Start with production overlay
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

    log_success "Services started"
}

# Wait for health checks to pass
wait_for_health() {
    log_info "Waiting for health checks (timeout: ${HEALTH_TIMEOUT}s)..."
    cd "$CORE_DIR"

    local start_time=$(date +%s)
    local services=("hivecfm-core" "hivecfm-postgres" "hivecfm-redis" "hivecfm-metabase" "hivecfm-superset")

    for service in "${services[@]}"; do
        log_info "Checking $service..."
        local healthy=false

        while [ "$healthy" = false ]; do
            local elapsed=$(($(date +%s) - start_time))

            if [ $elapsed -gt $HEALTH_TIMEOUT ]; then
                log_error "Health check timeout exceeded for $service"
                log_error "Check logs with: docker compose logs $service"
                return 1
            fi

            # Check if container exists and is healthy
            local status=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "not_found")

            case "$status" in
                "healthy")
                    log_success "$service is healthy"
                    healthy=true
                    ;;
                "unhealthy")
                    log_error "$service is unhealthy"
                    docker compose logs --tail=50 "$service"
                    return 1
                    ;;
                "starting")
                    echo -n "."
                    sleep 5
                    ;;
                "not_found")
                    # Container may not have health check, check if running
                    local running=$(docker inspect --format='{{.State.Running}}' "$service" 2>/dev/null || echo "false")
                    if [ "$running" = "true" ]; then
                        log_success "$service is running (no health check)"
                        healthy=true
                    else
                        echo -n "."
                        sleep 5
                    fi
                    ;;
                *)
                    echo -n "."
                    sleep 5
                    ;;
            esac
        done
    done

    echo ""
    log_success "All services are healthy"
}

# Show service status
show_status() {
    log_info "Service Status:"
    cd "$CORE_DIR"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
}

# Show service logs
show_logs() {
    cd "$CORE_DIR"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 -f
}

# Cleanup old Docker images
cleanup_images() {
    if [ "$SKIP_CLEANUP" = "true" ]; then
        log_warn "Skipping image cleanup (SKIP_CLEANUP=true)"
        return
    fi

    log_info "Cleaning up old Docker images..."

    # Remove dangling images
    docker image prune -f

    # Remove unused build cache older than 7 days
    docker builder prune -f --filter "until=168h"

    log_success "Cleanup completed"
}

# Full deployment
full_deploy() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}       HiveCFM Production Deployment        ${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "Deployment Directory: $DEPLOY_DIR"
    echo "Date: $(date)"
    echo ""

    check_prerequisites

    echo ""
    log_info "Step 1/6: Pulling latest code..."
    pull_code

    echo ""
    log_info "Step 2/6: Building Docker images..."
    build_images

    echo ""
    log_info "Step 3/6: Stopping existing services..."
    stop_services

    echo ""
    log_info "Step 4/6: Starting new services..."
    start_services

    echo ""
    log_info "Step 5/6: Waiting for health checks..."
    wait_for_health

    echo ""
    log_info "Step 6/6: Cleaning up old images..."
    cleanup_images

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}       Deployment Complete!                 ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    show_status
    echo ""
    echo "Access the application at:"
    echo "  - HiveCFM Core: https://hivecfm.xcai.io"
    echo "  - Metabase:     https://hivecfm.xcai.io:3001"
    echo "  - Superset:     https://hivecfm.xcai.io:3002 (when enabled)"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    --pull)
        check_prerequisites
        pull_code
        ;;
    --build)
        check_prerequisites
        build_images
        ;;
    --restart)
        check_prerequisites
        stop_services
        start_services
        wait_for_health
        ;;
    --status)
        show_status
        ;;
    --logs)
        show_logs
        ;;
    "")
        full_deploy
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        ;;
esac
