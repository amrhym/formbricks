import { beforeEach, describe, expect, test, vi } from "vitest";
import { performHealthChecks } from "@/modules/api/v2/health/lib/health-checks";
import { GET } from "./route";

// Mock the health checks module
vi.mock("@/modules/api/v2/health/lib/health-checks", () => ({
  performHealthChecks: vi.fn(),
}));

describe("/api/health endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T20:00:00.000Z"));
  });

  test("returns 200 with healthy status when all checks pass", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: true,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        status: "healthy",
        checks: {
          database: true,
          cache: true,
        },
        timestamp: "2026-01-11T20:00:00.000Z",
      },
    });
  });

  test("returns 503 with unhealthy status when database check fails", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: false,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      data: {
        status: "unhealthy",
        checks: {
          database: false,
          cache: true,
        },
        timestamp: "2026-01-11T20:00:00.000Z",
      },
    });
  });

  test("returns 503 with unhealthy status when cache check fails", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: true,
        cache_database: false,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      data: {
        status: "unhealthy",
        checks: {
          database: true,
          cache: false,
        },
        timestamp: "2026-01-11T20:00:00.000Z",
      },
    });
  });

  test("returns 503 with unhealthy status when both checks fail", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: false,
        cache_database: false,
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      data: {
        status: "unhealthy",
        checks: {
          database: false,
          cache: false,
        },
        timestamp: "2026-01-11T20:00:00.000Z",
      },
    });
  });

  test("returns 503 when health check endpoint itself fails", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: false,
      error: {
        type: "internal_server_error",
        details: [{ field: "health", issue: "Failed to perform health checks" }],
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      data: {
        status: "unhealthy",
        checks: {
          database: false,
          cache: false,
        },
        timestamp: "2026-01-11T20:00:00.000Z",
      },
    });
  });

  test("timestamp is in ISO 8601 format", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: true,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    // Verify ISO 8601 format with regex
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(body.data.timestamp).toMatch(iso8601Regex);

    // Verify it's a valid date
    const parsedDate = new Date(body.data.timestamp);
    expect(parsedDate.toISOString()).toBe(body.data.timestamp);
  });

  test("response follows required format structure", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: true,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    // Verify top-level structure
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("data");

    // Verify data structure
    expect(body.data).toHaveProperty("status");
    expect(body.data).toHaveProperty("checks");
    expect(body.data).toHaveProperty("timestamp");

    // Verify checks structure
    expect(body.data.checks).toHaveProperty("database");
    expect(body.data.checks).toHaveProperty("cache");

    // Verify types
    expect(typeof body.success).toBe("boolean");
    expect(typeof body.data.status).toBe("string");
    expect(typeof body.data.checks.database).toBe("boolean");
    expect(typeof body.data.checks.cache).toBe("boolean");
    expect(typeof body.data.timestamp).toBe("string");
  });
});
