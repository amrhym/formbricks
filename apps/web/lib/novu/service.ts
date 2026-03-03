import "server-only";
import { logger } from "@hivecfm/logger";
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

/**
 * Fetch the first notification group ID from Novu.
 * Novu requires a notificationGroupId when creating workflows.
 */
async function getDefaultNotificationGroupId(config: NovuConfig): Promise<string> {
  const response = (await novuApiRequest("GET", "/v1/notification-groups", undefined, config)) as {
    data: Array<{ _id: string; name: string }>;
  };

  if (!response.data || response.data.length === 0) {
    throw new Error("No notification groups found in Novu. Please create one first.");
  }

  return response.data[0]._id;
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
 * Create an email workflow with HTML content in Novu.
 * Returns the workflow ID (_id).
 */
export async function createEmailWorkflow(
  environmentId: string,
  workflowName: string,
  subject: string,
  htmlContent: string
): Promise<string> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    const notificationGroupId = await getDefaultNotificationGroupId(config);

    const response = (await novuApiRequest(
      "POST",
      "/v1/workflows",
      {
        name: workflowName,
        notificationGroupId,
        steps: [
          {
            template: {
              type: "email",
              content: htmlContent,
              subject,
            },
            active: true,
          },
        ],
        active: true,
      },
      config
    )) as { data: { _id: string } };

    logger.info(
      { environmentId, workflowName, workflowId: response.data._id },
      "Created email workflow in Novu"
    );

    return response.data._id;
  } catch (error) {
    logger.error(
      { environmentId, workflowName, error: error instanceof Error ? error.message : String(error) },
      "Failed to create email workflow in Novu"
    );
    throw error;
  }
}

/**
 * Create an SMS workflow in Novu.
 * Returns the workflow ID (_id).
 */
export async function createSmsWorkflow(
  environmentId: string,
  workflowName: string,
  messageText: string
): Promise<string> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    const notificationGroupId = await getDefaultNotificationGroupId(config);

    const response = (await novuApiRequest(
      "POST",
      "/v1/workflows",
      {
        name: workflowName,
        notificationGroupId,
        steps: [
          {
            template: {
              type: "sms",
              content: messageText,
            },
            active: true,
          },
        ],
        active: true,
      },
      config
    )) as { data: { _id: string } };

    logger.info(
      { environmentId, workflowName, workflowId: response.data._id },
      "Created SMS workflow in Novu"
    );

    return response.data._id;
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
  payload?: Record<string, unknown>
): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest(
      "POST",
      "/v1/events/trigger",
      {
        name: workflowId,
        to: { subscriberId },
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
 * Delete a workflow from Novu.
 */
export async function deleteWorkflow(environmentId: string, workflowId: string): Promise<void> {
  const config = await getRequiredNovuConfig(environmentId);

  try {
    await novuApiRequest("DELETE", `/v1/workflows/${encodeURIComponent(workflowId)}`, undefined, config);

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
