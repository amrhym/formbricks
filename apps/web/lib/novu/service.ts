import "server-only";
import { logger } from "@hivecfm/logger";
import type { TCampaignNovuMessage, TCampaignNovuStats } from "@hivecfm/types/campaign";
import { IS_NOVU_CONFIGURED, NOVU_API_KEY, NOVU_API_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";

interface NovuConfig {
  apiKey: string;
  apiUrl: string;
}

/**
 * Get Novu config: first checks DB integration, then falls back to env vars.
 * Returns null if neither is configured.
 */
async function getNovuConfig(environmentId: string): Promise<NovuConfig | null> {
  try {
    const integration = await getIntegrationByType(environmentId, "novu");
    if (integration?.config) {
      const config = integration.config as { key?: { apiKey?: string; apiUrl?: string } };
      if (config.key?.apiKey && config.key?.apiUrl) {
        return { apiKey: config.key.apiKey, apiUrl: config.key.apiUrl };
      }
    }
  } catch (error) {
    logger.warn(
      { environmentId, error: error instanceof Error ? error.message : String(error) },
      "Failed to fetch Novu integration from DB, falling back to env vars"
    );
  }

  // Fallback to env vars
  if (IS_NOVU_CONFIGURED) {
    return { apiKey: NOVU_API_KEY!, apiUrl: NOVU_API_URL };
  }

  return null;
}

/**
 * Make a request to the Novu API.
 */
async function novuApiRequest(
  method: string,
  path: string,
  body: unknown,
  config: NovuConfig
): Promise<unknown> {
  const url = `${config.apiUrl}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${config.apiKey}`,
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Novu API ${method} ${path} returned ${response.status}: ${text}`);
  }

  // DELETE responses may have no body
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return null;
}

/**
 * Retrieve a required Novu config or throw if not configured.
 */
async function getRequiredNovuConfig(environmentId: string): Promise<NovuConfig> {
  const config = await getNovuConfig(environmentId);
  if (!config) {
    throw new Error("Novu is not configured. Please set up Novu integration or environment variables.");
  }
  return config;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List active integrations/providers from Novu.
 */
export async function listActiveIntegrations(
  environmentId: string
): Promise<Array<{ channel: string; providerId: string; name: string; active: boolean }>> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    const response = (await novuApiRequest("GET", "/v1/integrations/active", undefined, config)) as {
      data: Array<{ channel: string; providerId: string; name: string; active: boolean }>;
    };

    return (response.data ?? []).map((integration) => ({
      channel: integration.channel,
      providerId: integration.providerId,
      name: integration.name,
      active: integration.active,
    }));
  } catch (error) {
    logger.error(
      { environmentId, error: error instanceof Error ? error.message : String(error) },
      "Failed to list active Novu integrations"
    );
    throw error;
  }
}

/**
 * Create an email workflow with HTML content in Novu (v2 API).
 * Returns the workflowId (used to trigger the workflow).
 */
export async function createEmailWorkflow(
  environmentId: string,
  workflowName: string,
  subject: string,
  htmlContent: string
): Promise<string> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    const response = (await novuApiRequest(
      "POST",
      "/v2/workflows",
      {
        name: workflowName,
        workflowId: workflowName,
        steps: [
          {
            name: "send-email",
            type: "email",
            controlValues: {
              subject,
              body: htmlContent,
              editorType: "html",
              disableOutputSanitization: true,
            },
          },
        ],
      },
      config
    )) as { data: { workflowId: string } };

    const workflowId = response.data.workflowId;

    logger.info({ environmentId, workflowName, workflowId }, "Created email workflow in Novu (v2)");

    return workflowId;
  } catch (error) {
    logger.error(
      { environmentId, workflowName, error: error instanceof Error ? error.message : String(error) },
      "Failed to create email workflow in Novu"
    );
    throw error;
  }
}

/**
 * Create an SMS workflow in Novu (v2 API).
 * Returns the workflowId (used to trigger the workflow).
 */
export async function createSmsWorkflow(
  environmentId: string,
  workflowName: string,
  messageText: string
): Promise<string> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    const response = (await novuApiRequest(
      "POST",
      "/v2/workflows",
      {
        name: workflowName,
        workflowId: workflowName,
        steps: [
          {
            name: "send-sms",
            type: "sms",
            controlValues: {
              body: messageText,
            },
          },
        ],
      },
      config
    )) as { data: { workflowId: string } };

    const workflowId = response.data.workflowId;

    logger.info({ environmentId, workflowName, workflowId }, "Created SMS workflow in Novu (v2)");

    return workflowId;
  } catch (error) {
    logger.error(
      { environmentId, workflowName, error: error instanceof Error ? error.message : String(error) },
      "Failed to create SMS workflow in Novu"
    );
    throw error;
  }
}

/**
 * Trigger a workflow for a single subscriber.
 */
export async function triggerWorkflow(
  environmentId: string,
  workflowId: string,
  subscriberId: string,
  payload?: Record<string, unknown>,
  overrides?: { email?: string; phone?: string }
): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest(
      "POST",
      "/v1/events/trigger",
      {
        name: workflowId,
        to: { subscriberId, ...overrides },
        payload: payload || {},
      },
      config
    );

    logger.info({ environmentId, workflowId, subscriberId }, "Triggered Novu workflow");
  } catch (error) {
    logger.error(
      {
        environmentId,
        workflowId,
        subscriberId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to trigger Novu workflow"
    );
    throw error;
  }
}

/**
 * Bulk trigger a workflow for multiple subscribers.
 */
export async function triggerBulkWorkflow(
  environmentId: string,
  workflowId: string,
  subscribers: Array<{ subscriberId: string; payload?: Record<string, unknown> }>
): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest(
      "POST",
      "/v1/events/trigger/bulk",
      {
        events: subscribers.map((s) => ({
          name: workflowId,
          to: { subscriberId: s.subscriberId },
          payload: s.payload || {},
        })),
      },
      config
    );

    logger.info(
      { environmentId, workflowId, subscriberCount: subscribers.length },
      "Bulk triggered Novu workflow"
    );
  } catch (error) {
    logger.error(
      {
        environmentId,
        workflowId,
        subscriberCount: subscribers.length,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to bulk trigger Novu workflow"
    );
    throw error;
  }
}

/**
 * Delete a workflow from Novu (v2 API).
 */
export async function deleteWorkflow(environmentId: string, workflowId: string): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest("DELETE", `/v2/workflows/${encodeURIComponent(workflowId)}`, undefined, config);

    logger.info({ environmentId, workflowId }, "Deleted Novu workflow");
  } catch (error) {
    logger.error(
      { environmentId, workflowId, error: error instanceof Error ? error.message : String(error) },
      "Failed to delete Novu workflow"
    );
    throw error;
  }
}

/**
 * Send an individual SMS message via Novu by triggering the generic
 * "campaign-sms-outbound" workflow with a {{message}} payload variable.
 */
export async function sendSmsMessage(
  environmentId: string,
  subscriberId: string,
  message: string
): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest(
      "POST",
      "/v1/events/trigger",
      {
        name: "campaign-sms-outbound",
        to: { subscriberId },
        payload: { message },
      },
      config
    );

    logger.info({ environmentId, subscriberId }, "Sent SMS message via Novu");
  } catch (error) {
    logger.error(
      { environmentId, subscriberId, error: error instanceof Error ? error.message : String(error) },
      "Failed to send SMS message via Novu"
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Analytics API
// ---------------------------------------------------------------------------

interface NovuRawMessage {
  _id: string;
  email?: string;
  phone?: string;
  status: string;
  providerId?: string;
  seen: boolean;
  read: boolean;
  createdAt: string;
  subject?: string;
  templateIdentifier?: string;
}

/**
 * Resolve a workflow's internal `_id` from its human-readable `workflowId`.
 */
async function resolveWorkflowInternalId(config: NovuConfig, novuWorkflowId: string): Promise<string | null> {
  try {
    const response = (await novuApiRequest(
      "GET",
      `/v2/workflows/${encodeURIComponent(novuWorkflowId)}`,
      undefined,
      config
    )) as { data?: { _id?: string } };

    return response.data?._id ?? null;
  } catch (error) {
    logger.warn(
      { novuWorkflowId, error: error instanceof Error ? error.message : String(error) },
      "Could not resolve Novu workflow _id"
    );
    return null;
  }
}

/**
 * Fetch all messages for a given workflow from Novu (paginated).
 */
export async function getWorkflowMessages(
  environmentId: string,
  novuWorkflowId: string
): Promise<TCampaignNovuMessage[]> {
  const config = await getRequiredNovuConfig(environmentId);
  const internalId = await resolveWorkflowInternalId(config, novuWorkflowId);

  if (!internalId) {
    return [];
  }

  const allMessages: TCampaignNovuMessage[] = [];
  let page = 0;
  const limit = 100;

  try {
    while (true) {
      const response = (await novuApiRequest(
        "GET",
        `/v1/messages?templateId=${encodeURIComponent(internalId)}&channel=email&limit=${limit}&page=${page}`,
        undefined,
        config
      )) as { data: NovuRawMessage[]; totalCount?: number };

      const messages = response.data ?? [];
      for (const msg of messages) {
        // Novu's templateId filter is unreliable — filter client-side by templateIdentifier
        if (msg.templateIdentifier !== novuWorkflowId) continue;
        allMessages.push({
          messageId: msg._id,
          email: msg.email ?? msg.phone ?? "",
          status: msg.status,
          provider: msg.providerId ?? "",
          seen: msg.seen,
          read: msg.read,
          createdAt: msg.createdAt,
        });
      }

      if (messages.length < limit) break;
      page++;

      // Safety: don't fetch more than 50 pages (5000 messages)
      if (page >= 50) break;
    }

    return allMessages;
  } catch (error) {
    logger.error(
      { environmentId, novuWorkflowId, error: error instanceof Error ? error.message : String(error) },
      "Failed to fetch workflow messages from Novu"
    );
    return [];
  }
}

/**
 * Aggregate stats from workflow messages.
 */
export async function getWorkflowStats(
  environmentId: string,
  novuWorkflowId: string
): Promise<TCampaignNovuStats> {
  const messages = await getWorkflowMessages(environmentId, novuWorkflowId);

  const stats: TCampaignNovuStats = {
    total: messages.length,
    sent: 0,
    failed: 0,
    delivered: 0,
    seen: 0,
    read: 0,
    messages,
  };

  for (const msg of messages) {
    if (msg.status === "sent") {
      stats.sent++;
      stats.delivered++;
    } else if (msg.status === "error" || msg.status === "failed") {
      stats.failed++;
    }
    if (msg.seen) stats.seen++;
    if (msg.read) stats.read++;
  }

  return stats;
}
