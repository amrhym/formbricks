#!/bin/bash
# HiveCFM Metabase Setup Script
#
# This script initializes Metabase with proper configuration for HiveCFM analytics.
# Run this after Metabase container is healthy.
#
# Prerequisites:
#   - Metabase container running and healthy
#   - METABASE_URL environment variable set

set -e

METABASE_HOST="${METABASE_URL:-http://localhost:3001}"

echo "=== HiveCFM Metabase Setup ==="
echo "Metabase URL: $METABASE_HOST"
echo ""

# Wait for Metabase to be ready
echo "Waiting for Metabase to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$METABASE_HOST/api/health" | grep -q "ok"; then
        echo "Metabase is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Metabase did not become ready in time"
    exit 1
fi

echo ""
echo "=== Manual Setup Required ==="
echo ""
echo "Please complete the following steps in the Metabase UI:"
echo ""
echo "1. INITIAL SETUP"
echo "   - Navigate to: $METABASE_HOST"
echo "   - Create admin account"
echo "   - Skip 'Add your data' (we'll configure it manually)"
echo ""
echo "2. ADD HIVECFM DATABASE CONNECTION"
echo "   - Go to: Settings (gear icon) > Admin settings > Databases > Add database"
echo "   - Database type: PostgreSQL"
echo "   - Display name: HiveCFM"
echo "   - Host: postgres (or 'hivecfm-postgres' if using container name)"
echo "   - Port: 5432"
echo "   - Database name: hivecfm"
echo "   - Username: metabase"
echo "   - Password: metabase (or value from METABASE_DB_PASSWORD)"
echo ""
echo "3. ENABLE EMBEDDING"
echo "   - Go to: Settings > Admin settings > Embedding"
echo "   - Enable 'Static embedding'"
echo "   - Enable 'Signed embedding'"
echo "   - The secret key is already configured in your environment"
echo ""
echo "4. CREATE DASHBOARDS"
echo "   Suggested dashboards for HiveCFM:"
echo ""
echo "   a) Survey Overview Dashboard:"
echo "      - Total surveys count"
echo "      - Active surveys"
echo "      - Responses over time (line chart)"
echo "      - Response rate by survey"
echo ""
echo "   b) Response Analytics Dashboard:"
echo "      - Total responses"
echo "      - Responses by survey"
echo "      - Response distribution by question type"
echo "      - Completion rate"
echo ""
echo "   c) User Engagement Dashboard:"
echo "      - Total contacts"
echo "      - New contacts over time"
echo "      - Contact sources"
echo "      - Response rate by contact segment"
echo ""
echo "5. ENABLE DASHBOARD EMBEDDING"
echo "   - For each dashboard you want to embed:"
echo "   - Click '...' menu > Sharing and embedding"
echo "   - Enable 'Enable sharing'"
echo "   - Note the dashboard ID from the URL"
echo ""
echo "=== Configuration Complete ==="
echo ""
echo "After setup, update the DEFAULT_DASHBOARD_ID in:"
echo "  apps/web/modules/analytics/page.tsx"
echo ""
echo "The embedded dashboard will then appear in the HiveCFM Analytics page."
