export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantLicense {
  id: string;
  organizationId: string;
  licenseKey: string;
  maxCompletedResponses: number;
  maxUsers: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseStatus extends TenantLicense {
  valid: boolean;
  usage: {
    completedResponsesThisYear: number;
    currentUsers: number;
  };
}

export interface LicenseCreateInput {
  maxCompletedResponses?: number;
  maxUsers?: number;
  addonAiInsights?: boolean;
  addonCampaignManagement?: boolean;
  validFrom?: string;
  validUntil: string;
}

export interface LicenseUpdateInput {
  maxCompletedResponses?: number;
  maxUsers?: number;
  addonAiInsights?: boolean;
  addonCampaignManagement?: boolean;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface LicenseActivateResult extends TenantLicense {
  valid: boolean;
}

export interface TenantDetail {
  organization: Tenant;
  project?: { id: string; environments: { id: string; type: string }[] };
  quota?: {
    maxSurveys: number;
    maxResponsesPerMonth: number;
    maxStorageMB: number;
    maxApiCallsPerDay: number;
    maxContacts: number;
  };
  license?: TenantLicense | null;
}

class HiveCFMClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...options?.headers,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`API returned non-JSON response (${res.status}). The endpoint may not exist.`);
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || `API error: ${res.status}`);
    }

    return json.data;
  }

  async listTenants(): Promise<Tenant[]> {
    return this.request<Tenant[]>("/api/v1/management/tenants");
  }

  async getTenant(orgId: string): Promise<TenantDetail> {
    return this.request<TenantDetail>(`/api/v1/management/tenants/${orgId}`);
  }

  async getLicenseStatus(orgId: string): Promise<LicenseStatus | null> {
    try {
      return await this.request<LicenseStatus>(`/api/v1/management/tenants/${orgId}/license`);
    } catch {
      return null;
    }
  }

  async createLicense(orgId: string, data: LicenseCreateInput): Promise<TenantLicense> {
    return this.request<TenantLicense>(`/api/v1/management/tenants/${orgId}/license`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLicense(orgId: string, data: LicenseUpdateInput): Promise<TenantLicense> {
    return this.request<TenantLicense>(`/api/v1/management/tenants/${orgId}/license`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async activateLicense(licenseKey: string): Promise<LicenseActivateResult> {
    return this.request<LicenseActivateResult>("/api/v1/management/license/activate", {
      method: "POST",
      body: JSON.stringify({ licenseKey }),
    });
  }
}

export const apiClient = new HiveCFMClient(
  process.env.HIVECFM_API_URL || "http://localhost:3000",
  process.env.HIVECFM_API_KEY || ""
);
