import { performHealthChecks } from "@/modules/api/v2/health/lib/health-checks";

/**
 * GET /api/ready
 *
 * Readiness probe endpoint for Kubernetes/container orchestration.
 * Returns simple ready status for load balancer health checks.
 *
 * HTTP 200: { ready: true } - All critical dependencies available
 * HTTP 503: { ready: false, reason: "..." } - One or more dependencies unavailable
 */
export async function GET() {
  const healthResult = await performHealthChecks();

  // If health check endpoint itself fails
  if (!healthResult.ok) {
    return Response.json(
      {
        ready: false,
        reason: "health check failed",
      },
      { status: 503 }
    );
  }

  const { main_database, cache_database } = healthResult.data;

  // Build reason string for unhealthy dependencies
  if (!main_database && !cache_database) {
    return Response.json(
      {
        ready: false,
        reason: "database and cache unavailable",
      },
      { status: 503 }
    );
  }

  if (!main_database) {
    return Response.json(
      {
        ready: false,
        reason: "database unavailable",
      },
      { status: 503 }
    );
  }

  if (!cache_database) {
    return Response.json(
      {
        ready: false,
        reason: "cache unavailable",
      },
      { status: 503 }
    );
  }

  // All systems ready
  return Response.json(
    {
      ready: true,
    },
    { status: 200 }
  );
}
