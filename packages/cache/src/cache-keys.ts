import { type CacheKey, type CustomCacheNamespace } from "@/types/keys";
import { makeCacheKey } from "./utils/key";

/**
 * Enterprise-grade cache key generator following industry best practices
 * Pattern: fb:\{resource\}:\{identifier\}:\{subResource\}
 *
 * Benefits:
 * - Clear namespace hierarchy (fb = formbricks)
 * - Collision-proof across environments
 * - Easy debugging and monitoring
 * - Predictable invalidation patterns
 * - Multi-tenant safe
 * - Type-safe with branded CacheKey type
 */

export const createCacheKey = {
  // Environment-related keys
  environment: {
    state: (environmentId: string): CacheKey => makeCacheKey("env", environmentId, "state"),
    config: (environmentId: string): CacheKey => makeCacheKey("env", environmentId, "config"),
    segments: (environmentId: string): CacheKey => makeCacheKey("env", environmentId, "segments"),
  },

  // Organization-related keys
  organization: {
    billing: (organizationId: string): CacheKey => makeCacheKey("org", organizationId, "billing"),
  },

  // Tenant-related keys
  tenant: {
    quota: (organizationId: string): CacheKey => makeCacheKey("tenant", organizationId, "quota"),
    branding: (organizationId: string): CacheKey => makeCacheKey("tenant", organizationId, "branding"),
    apiCalls: (organizationId: string): CacheKey => makeCacheKey("tenant", organizationId, "apiCalls"),
    responses: (organizationId: string): CacheKey => makeCacheKey("tenant", organizationId, "responses"),
  },

  // Superset integration keys
  superset: {
    adminToken: (): CacheKey => makeCacheKey("superset", "admin", "token"),
  },

  // License and enterprise features
  license: {
    status: (organizationId: string): CacheKey => makeCacheKey("license", organizationId, "status"),
    previous_result: (organizationId: string): CacheKey =>
      makeCacheKey("license", organizationId, "previous_result"),
  },

  // Rate limiting and security
  rateLimit: {
    core: (namespace: string, identifier: string, windowStart: number): CacheKey =>
      makeCacheKey("rate_limit", namespace, identifier, String(windowStart)),
  },

  // Custom keys with validation
  custom: (namespace: CustomCacheNamespace, identifier: string, subResource?: string): CacheKey => {
    return subResource !== undefined
      ? makeCacheKey(namespace, identifier, subResource)
      : makeCacheKey(namespace, identifier);
  },
};
