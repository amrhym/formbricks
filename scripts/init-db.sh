#!/bin/bash
# HiveCFM Database Initialization Script
# This script runs on first PostgreSQL container startup
#
# Creates:
#   1. Application schema (public) - full access for hivecfm-core
#   2. Metabase user with read-only access to public schema
#   3. Superset user with read-only access to public schema
#   4. Metabase application database for internal storage

set -e

# Get passwords from environment variables (set in docker-compose.yml)
# Default values are used if not set (for development only)
METABASE_DB_PASSWORD="${METABASE_DB_PASSWORD:-metabase}"
SUPERSET_DB_PASSWORD="${SUPERSET_DB_PASSWORD:-superset}"

echo "HiveCFM Database Initialization Starting..."

# Create Metabase application database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Check if metabase_app database exists, create if not
    SELECT 'CREATE DATABASE metabase_app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'metabase_app')\gexec
EOSQL

# Create Metabase user with password from environment
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'metabase') THEN
            CREATE ROLE metabase WITH LOGIN PASSWORD '${METABASE_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Create schema for Metabase internal storage
    CREATE SCHEMA IF NOT EXISTS metabase AUTHORIZATION metabase;

    -- Grant Metabase full access to its own schema
    GRANT ALL PRIVILEGES ON SCHEMA metabase TO metabase;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metabase TO metabase;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metabase TO metabase;
    ALTER DEFAULT PRIVILEGES IN SCHEMA metabase GRANT ALL PRIVILEGES ON TABLES TO metabase;
    ALTER DEFAULT PRIVILEGES IN SCHEMA metabase GRANT ALL PRIVILEGES ON SEQUENCES TO metabase;

    -- Grant Metabase read-only access to public schema (HiveCFM data)
    GRANT USAGE ON SCHEMA public TO metabase;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase;
EOSQL

# Grant metabase user access to metabase_app database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "metabase_app" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE metabase_app TO metabase;
    GRANT ALL PRIVILEGES ON SCHEMA public TO metabase;
EOSQL

# Create Superset read-only user with password from environment
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'superset_readonly') THEN
            CREATE ROLE superset_readonly WITH LOGIN PASSWORD '${SUPERSET_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Grant Superset read-only access to public schema
    GRANT USAGE ON SCHEMA public TO superset_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO superset_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO superset_readonly;
EOSQL

# Enable required extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- pgvector for AI/ML features
    CREATE EXTENSION IF NOT EXISTS vector;

    -- UUID generation
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "HiveCFM Database Initialization Complete"
echo "Created users: metabase (read-write metabase_app, read-only hivecfm), superset_readonly"
echo "Enabled extensions: vector, uuid-ossp"
