#!/bin/bash
# HiveCFM Superset Setup Script
#
# This script initializes Apache Superset for HiveCFM analytics.
# Run this after Superset container is healthy.
#
# Prerequisites:
#   - Superset container running and healthy
#   - PostgreSQL database with superset_app database created

set -e

SUPERSET_CONTAINER="${SUPERSET_CONTAINER:-hivecfm-superset}"
SUPERSET_HOST="${SUPERSET_URL:-http://localhost:3002}"

echo "=== HiveCFM Superset Setup ==="
echo "Superset Container: $SUPERSET_CONTAINER"
echo "Superset URL: $SUPERSET_HOST"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${SUPERSET_CONTAINER}$"; then
    echo "ERROR: Superset container '$SUPERSET_CONTAINER' is not running"
    echo "Start it with: docker compose up -d superset"
    exit 1
fi

echo "Superset container is running"
echo ""

# Initialize the database
echo "Step 1: Initializing Superset database..."
docker exec -it "$SUPERSET_CONTAINER" superset db upgrade
echo "Database initialized!"
echo ""

# Create admin user
echo "Step 2: Creating admin user..."
echo ""
read -p "Enter admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Enter admin first name [Admin]: " ADMIN_FIRSTNAME
ADMIN_FIRSTNAME=${ADMIN_FIRSTNAME:-Admin}

read -p "Enter admin last name [User]: " ADMIN_LASTNAME
ADMIN_LASTNAME=${ADMIN_LASTNAME:-User}

read -p "Enter admin email [admin@hivecfm.local]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@hivecfm.local}

read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""

docker exec -it "$SUPERSET_CONTAINER" superset fab create-admin \
    --username "$ADMIN_USER" \
    --firstname "$ADMIN_FIRSTNAME" \
    --lastname "$ADMIN_LASTNAME" \
    --email "$ADMIN_EMAIL" \
    --password "$ADMIN_PASSWORD"

echo "Admin user created!"
echo ""

# Initialize Superset
echo "Step 3: Initializing Superset..."
docker exec -it "$SUPERSET_CONTAINER" superset init
echo "Superset initialized!"
echo ""

echo "=== Superset Setup Complete ==="
echo ""
echo "You can now access Superset at: $SUPERSET_HOST"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. LOGIN TO SUPERSET"
echo "   - Navigate to: $SUPERSET_HOST"
echo "   - Login with the admin credentials you just created"
echo ""
echo "2. ADD HIVECFM DATABASE CONNECTION"
echo "   - Go to: Settings > Database Connections > + Database"
echo "   - Select: PostgreSQL"
echo "   - SQLAlchemy URI: postgresql://superset_readonly:\${SUPERSET_DB_PASSWORD}@postgres:5432/hivecfm"
echo "   - Display Name: HiveCFM"
echo "   - Click 'Test Connection' then 'Connect'"
echo ""
echo "3. EXPLORE DATA"
echo "   - Go to: SQL Lab > SQL Editor"
echo "   - Select 'HiveCFM' database"
echo "   - Explore tables: Survey, SurveyResponse, Contact, etc."
echo ""
echo "4. CREATE CHARTS AND DASHBOARDS"
echo "   - Use the Chart Builder or SQL Lab"
echo "   - Organize charts into dashboards"
echo ""
echo "5. ENABLE EMBEDDING (Optional)"
echo "   - Configure guest user access"
echo "   - Enable public dashboards"
echo ""
