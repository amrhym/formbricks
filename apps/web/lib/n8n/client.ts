import "server-only";
import { logger } from "@hivecfm/logger";

const N8N_BASE_URL = process.env.N8N_BASE_URL || "http://hivecfm-n8n:5678";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: unknown[];
  connections: unknown;
  settings?: unknown;
  tags?: { id: string; name: string }[];
}

interface N8nCredential {
  id: string;
  name: string;
  type: string;
}

export class N8nClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || N8N_BASE_URL;
    this.apiKey = apiKey || N8N_API_KEY;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, endpoint, body: errorText }, "n8n API request failed");
      throw new Error(`n8n API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // Workflow CRUD
  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("POST", "/workflows", workflow);
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("GET", `/workflows/${workflowId}`);
  }

  async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("PATCH", `/workflows/${workflowId}`, workflow);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request<void>("DELETE", `/workflows/${workflowId}`);
  }

  async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("PATCH", `/workflows/${workflowId}`, { active: true });
  }

  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>("PATCH", `/workflows/${workflowId}`, { active: false });
  }

  async listWorkflows(tags?: string[]): Promise<{ data: N8nWorkflow[] }> {
    let endpoint = "/workflows";
    if (tags && tags.length > 0) {
      endpoint += `?tags=${tags.join(",")}`;
    }
    return this.request<{ data: N8nWorkflow[] }>("GET", endpoint);
  }

  // Credential CRUD
  async createCredential(credential: {
    name: string;
    type: string;
    data: Record<string, unknown>;
  }): Promise<N8nCredential> {
    return this.request<N8nCredential>("POST", "/credentials", credential);
  }

  async updateCredential(
    credentialId: string,
    credential: { name?: string; type?: string; data?: Record<string, unknown> }
  ): Promise<N8nCredential> {
    return this.request<N8nCredential>("PATCH", `/credentials/${credentialId}`, credential);
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await this.request<void>("DELETE", `/credentials/${credentialId}`);
  }

  async listCredentials(): Promise<{ data: N8nCredential[] }> {
    return this.request<{ data: N8nCredential[] }>("GET", "/credentials");
  }

  /**
   * Check if n8n is reachable by calling a lightweight endpoint.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Tags
  async createTag(name: string): Promise<{ id: string; name: string }> {
    return this.request<{ id: string; name: string }>("POST", "/tags", { name });
  }

  // Executions
  async getExecution(executionId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/executions/${executionId}`);
  }
}

// Singleton instance
export const n8nClient = new N8nClient();
