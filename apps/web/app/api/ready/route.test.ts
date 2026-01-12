import { beforeEach, describe, expect, test, vi } from "vitest";
import { performHealthChecks } from "@/modules/api/v2/health/lib/health-checks";
import { GET } from "./route";

// Mock the health checks module
vi.mock("@/modules/api/v2/health/lib/health-checks", () => ({
  performHealthChecks: vi.fn(),
}));

describe("/api/ready endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 200 with ready: true when all checks pass", async () => {
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
      ready: true,
    });
  });

  test("returns 503 with reason when database is unavailable", async () => {
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
      ready: false,
      reason: "database unavailable",
    });
  });

  test("returns 503 with reason when cache is unavailable", async () => {
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
      ready: false,
      reason: "cache unavailable",
    });
  });

  test("returns 503 with reason when both database and cache are unavailable", async () => {
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
      ready: false,
      reason: "database and cache unavailable",
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
      ready: false,
      reason: "health check failed",
    });
  });

  test("response follows required format for ready state", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: true,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    // Verify structure
    expect(body).toHaveProperty("ready");
    expect(typeof body.ready).toBe("boolean");

    // When ready, should not have reason field
    expect(body).not.toHaveProperty("reason");
  });

  test("response follows required format for not-ready state", async () => {
    vi.mocked(performHealthChecks).mockResolvedValue({
      ok: true,
      data: {
        main_database: false,
        cache_database: true,
      },
    });

    const response = await GET();
    const body = await response.json();

    // Verify structure
    expect(body).toHaveProperty("ready");
    expect(body).toHaveProperty("reason");
    expect(typeof body.ready).toBe("boolean");
    expect(typeof body.reason).toBe("string");

    // When not ready, reason should be non-empty
    expect(body.reason.length).toBeGreaterThan(0);
  });
});
