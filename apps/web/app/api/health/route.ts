import { performHealthChecks } from "@/modules/api/v2/health/lib/health-checks";

/**
 * GET /api/health
 *
 * Returns comprehensive health status with database and cache checks.
 * Response format follows architecture specification:
 * { success: true/false, data: { status, checks, timestamp } }
 *
 * HTTP 200: All systems healthy
 * HTTP 503: One or more systems unhealthy
 */
export async function GET() {
  const healthResult = await performHealthChecks();

  // If health check endpoint itself fails (not individual checks)
  if (!healthResult.ok) {
    return Response.json(
      {
        success: false,
        data: {
          status: "unhealthy",
          checks: {
            database: false,
            cache: false,
          },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }

  const { main_database, cache_database } = healthResult.data;
  const isHealthy = main_database && cache_database;

  return Response.json(
    {
      success: isHealthy,
      data: {
        status: isHealthy ? "healthy" : "unhealthy",
        checks: {
          database: main_database,
          cache: cache_database,
        },
        timestamp: new Date().toISOString(),
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
