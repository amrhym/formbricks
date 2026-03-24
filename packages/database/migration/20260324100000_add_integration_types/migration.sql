-- Add new integration types for Superset, LLM, and HiveCFM Hub
ALTER TYPE "IntegrationType" ADD VALUE 'superset';
ALTER TYPE "IntegrationType" ADD VALUE 'llm';
ALTER TYPE "IntegrationType" ADD VALUE 'hivecfmHub';
