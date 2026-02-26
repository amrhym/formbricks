#!/bin/bash
# HiveCFM Database Initialization Script
# This script runs on first PostgreSQL container startup
#
# Creates:
#   1. Application schema (public) - full access for hivecfm-core
#   2. Superset user with read-only access to public schema

set -e

# Get passwords from environment variables (set in docker-compose.yml)
SUPERSET_DB_PASSWORD="${SUPERSET_DB_PASSWORD:-superset}"

echo "HiveCFM Database Initialization Starting..."

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

# Create Superset application database and user for metadata storage
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Check if superset_app database exists, create if not
    SELECT 'CREATE DATABASE superset_app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'superset_app')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'superset') THEN
            CREATE ROLE superset WITH LOGIN PASSWORD '${SUPERSET_DB_PASSWORD}';
        END IF;
    END
    \$\$;
EOSQL

# Grant superset user access to superset_app database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "superset_app" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE superset_app TO superset;
    GRANT ALL PRIVILEGES ON SCHEMA public TO superset;
EOSQL

# Enable required extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- pgvector for AI/ML features
    CREATE EXTENSION IF NOT EXISTS vector;

    -- UUID generation
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "HiveCFM Database Initialization Complete"
echo "Created users: superset (read-write superset_app), superset_readonly (read-only hivecfm)"
echo "Enabled extensions: vector, uuid-ossp"
