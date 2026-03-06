import "server-only";
import { logger } from "@hivecfm/logger";

const SUPERSET_BASE_URL = process.env.SUPERSET_BASE_URL || "http://hivecfm-superset:8088";
const SUPERSET_ADMIN_USERNAME = process.env.SUPERSET_ADMIN_USERNAME || "admin";
const SUPERSET_ADMIN_PASSWORD = process.env.SUPERSET_ADMIN_PASSWORD || "";

interface SupersetLoginResponse {
  access_token: string;
}

interface SupersetGuestTokenResponse {
  token: string;
}

export class SupersetAdminClient {
  private baseUrl: string;
  private adminToken: string | null = null;
  private csrfToken: string | null = null;
  private csrfCookies: string | null = null;
  private tokenExpiry: number = 0;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || SUPERSET_BASE_URL;
  }

  private async login(): Promise<string> {
    const now = Date.now();
    if (this.adminToken && now < this.tokenExpiry) {
      return this.adminToken;
    }

    // Reset CSRF when re-logging in
    this.csrfToken = null;
    this.csrfCookies = null;

    const response = await fetch(`${this.baseUrl}/api/v1/security/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: SUPERSET_ADMIN_USERNAME,
        password: SUPERSET_ADMIN_PASSWORD,
        provider: "db",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, "Superset login failed");
      throw new Error(`Superset login failed: ${response.status}`);
    }

    const data: SupersetLoginResponse = await response.json();
    this.adminToken = data.access_token;
    // Cache for 8 hours
    this.tokenExpiry = now + 8 * 60 * 60 * 1000;

    logger.info("Superset admin token acquired");
    return this.adminToken;
  }

  /**
   * Fetch a CSRF token from Superset. Required for POST/PUT/DELETE requests.
   * Superset validates CSRF via both the X-CSRFToken header and the session cookie.
   */
  private async fetchCsrfToken(): Promise<{ csrfToken: string; cookies: string }> {
    if (this.csrfToken && this.csrfCookies) {
      return { csrfToken: this.csrfToken, cookies: this.csrfCookies };
    }

    const adminToken = await this.login();

    const response = await fetch(`${this.baseUrl}/api/v1/security/csrf_token/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, "Superset CSRF token fetch failed");
      throw new Error(`Superset CSRF token failed: ${response.status}`);
    }

    const data = (await response.json()) as { result: string };
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    const cookies = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");

    this.csrfToken = data.result;
    this.csrfCookies = cookies;

    return { csrfToken: this.csrfToken, cookies: this.csrfCookies };
  }

  async getAdminToken(): Promise<string> {
    return this.login();
  }

  async mintGuestToken(
    dashboardId: string,
    rlsClause: string
  ): Promise<{ token: string; expiresAt: string }> {
    const adminToken = await this.login();
    const { csrfToken, cookies } = await this.fetchCsrfToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const response = await fetch(`${this.baseUrl}/api/v1/security/guest_token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "X-CSRFToken": csrfToken,
        Cookie: cookies,
      },
      body: JSON.stringify({
        user: { username: "guest", first_name: "Guest", last_name: "User" },
        resources: [{ type: "dashboard", id: dashboardId }],
        rls: [{ clause: rlsClause }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, "Superset guest token mint failed");
      // Invalidate cached CSRF on failure so next attempt re-fetches
      this.csrfToken = null;
      this.csrfCookies = null;
      throw new Error(`Superset guest token failed: ${response.status}`);
    }

    const data: SupersetGuestTokenResponse = await response.json();
    return { token: data.token, expiresAt };
  }

  async apiRequest(method: string, endpoint: string, body?: unknown): Promise<unknown> {
    const adminToken = await this.login();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    };

    // POST/PUT/DELETE need CSRF
    if (method !== "GET") {
      const { csrfToken, cookies } = await this.fetchCsrfToken();
      headers["X-CSRFToken"] = csrfToken;
      headers["Cookie"] = cookies;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Superset API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const supersetClient = new SupersetAdminClient();
