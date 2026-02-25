#!/bin/sh

set -eu
export NODE_ENV=production

# Function to run command with timeout if available, or without timeout as fallback
run_with_timeout() {
  _timeout_duration="$1"
  _timeout_name="$2"
  shift 2
  
  if command -v timeout >/dev/null 2>&1; then
    # timeout command is available, use it
    echo "Using timeout ($_timeout_duration seconds) for $_timeout_name"
    if ! timeout "$_timeout_duration" "$@"; then
      echo "❌ $_timeout_name timed out after $_timeout_duration seconds"
      echo "📋 This might indicate database connectivity issues"
      exit 1
    fi
  else
    # timeout not available, try to install it or run without timeout
    echo "⚠️ timeout command not found, attempting to install..."
    if command -v apk >/dev/null 2>&1; then
      apk add --no-cache coreutils >/dev/null 2>&1 || {
        echo "⚠️ Could not install timeout, running $_timeout_name without timeout protection"
        echo "📋 Note: Process may hang indefinitely if there are connectivity issues"
      }
    fi
    
    # Run the command (either with newly installed timeout or without timeout)
    if command -v timeout >/dev/null 2>&1; then
      echo "✅ timeout installed, using timeout ($_timeout_duration seconds) for $_timeout_name"
      if ! timeout "$_timeout_duration" "$@"; then
        echo "❌ $_timeout_name timed out after $_timeout_duration seconds"
        echo "📋 This might indicate database connectivity issues"
        exit 1
      fi
    else
      echo "Running $_timeout_name without timeout protection..."
      if ! "$@"; then
        echo "❌ $_timeout_name failed"
        echo "📋 This might indicate database connectivity issues"
        exit 1
      fi
    fi
  fi
}


echo "🗃️ Running database migrations..."
run_with_timeout 300 "database migration" sh -c '(cd packages/database && npm run db:migrate:deploy)'

echo "🗃️ Running SAML database setup..."
run_with_timeout 60 "SAML database setup" sh -c '(cd packages/database && npm run db:create-saml-database:deploy)'

echo "✅ Database setup completed"

# Apply RLS policies for multi-tenant isolation (optional, non-fatal)
# Requires psql client — apply manually via: docker exec hivecfm-postgres psql -U postgres -d hivecfm -f /path/to/script.sql
if [ -f "scripts/rls/enable-rls.sql" ] && command -v psql >/dev/null 2>&1; then
  echo "🔒 Applying Row Level Security policies..."
  run_with_timeout 60 "RLS enable" sh -c 'psql "$DATABASE_URL" -f scripts/rls/enable-rls.sql' || echo "⚠️ RLS enable failed (non-fatal)"
  run_with_timeout 60 "RLS policies" sh -c 'psql "$DATABASE_URL" -f scripts/rls/create-policies.sql' || echo "⚠️ RLS policies failed (non-fatal)"
  echo "✅ RLS policies applied"
else
  echo "⚠️ RLS scripts skipped (psql not available — apply manually)"
fi

echo "🚀 Starting Next.js server..."
exec node apps/web/server.js
