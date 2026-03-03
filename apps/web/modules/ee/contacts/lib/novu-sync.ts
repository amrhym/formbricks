import { logger } from "@hivecfm/logger";
import { IS_NOVU_CONFIGURED, NOVU_API_KEY, NOVU_API_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { TContactBulkUploadContact, TContactResponse } from "@/modules/ee/contacts/types/contact";

// Standard fields that map directly to Novu subscriber fields
const NOVU_STANDARD_FIELDS = ["email", "firstName", "lastName", "phone", "avatar", "locale", "timezone"];

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
 * Sync a single contact to Novu as a subscriber.
 * Best-effort: logs errors but never throws.
 */
export async function syncContactToNovu(contact: TContactResponse, environmentId: string): Promise<void> {
  const config = await getNovuConfig(environmentId);
  if (!config) return;

  try {
    const { subscriberId, ...subscriberData } = mapContactToSubscriber(contact.attributes);
    if (!subscriberId) {
      logger.warn({ contactId: contact.id }, "Skipping Novu sync: no userId attribute for subscriberId");
      return;
    }

    await novuApiRequest("POST", "/v1/subscribers", { subscriberId, ...subscriberData }, config);

    logger.info({ contactId: contact.id, subscriberId }, "Synced contact to Novu");
  } catch (error) {
    logger.error(
      { contactId: contact.id, error: error instanceof Error ? error.message : String(error) },
      "Failed to sync contact to Novu"
    );
  }
}

/**
 * Sync bulk contacts to Novu as subscribers.
 * Uses Novu's POST /v1/subscribers/bulk endpoint (max 500 per request).
 * Best-effort: logs errors but never throws.
 */
export async function syncBulkContactsToNovu(
  contacts: TContactBulkUploadContact[],
  environmentId: string
): Promise<void> {
  const config = await getNovuConfig(environmentId);
  if (!config) return;

  try {
    const subscribers = contacts
      .map((c) => {
        const attrs = flattenBulkAttributes(c.attributes);
        const { subscriberId, ...data } = mapContactToSubscriber(attrs);
        if (!subscriberId) return null;
        return { subscriberId, ...data };
      })
      .filter(Boolean);

    if (subscribers.length === 0) return;

    // Novu bulk endpoint accepts max 500
    for (let i = 0; i < subscribers.length; i += 500) {
      const batch = subscribers.slice(i, i + 500);
      await novuApiRequest("POST", "/v1/subscribers/bulk", { subscribers: batch }, config);
    }

    logger.info({ count: subscribers.length, environmentId }, "Bulk synced contacts to Novu");
  } catch (error) {
    logger.error(
      { environmentId, error: error instanceof Error ? error.message : String(error) },
      "Failed to bulk sync contacts to Novu"
    );
  }
}

/**
 * Sync contacts created from CSV upload to Novu.
 * Takes TContactResponse[] (contacts with flattened attributes).
 * Best-effort: logs errors but never throws.
 */
export async function syncCSVContactsToNovu(
  contacts: TContactResponse[],
  environmentId: string
): Promise<void> {
  const config = await getNovuConfig(environmentId);
  if (!config) return;

  try {
    const subscribers = contacts
      .map((c) => {
        const { subscriberId, ...data } = mapContactToSubscriber(c.attributes);
        if (!subscriberId) return null;
        return { subscriberId, ...data };
      })
      .filter(Boolean);

    if (subscribers.length === 0) return;

    // Novu bulk endpoint accepts max 500
    for (let i = 0; i < subscribers.length; i += 500) {
      const batch = subscribers.slice(i, i + 500);
      await novuApiRequest("POST", "/v1/subscribers/bulk", { subscribers: batch }, config);
    }

    logger.info({ count: subscribers.length, environmentId }, "CSV contacts synced to Novu");
  } catch (error) {
    logger.error(
      { environmentId, error: error instanceof Error ? error.message : String(error) },
      "Failed to sync CSV contacts to Novu"
    );
  }
}

/**
 * Delete a subscriber from Novu.
 * Best-effort: logs errors but never throws.
 */
export async function deleteSubscriberFromNovu(
  subscriberId: string | undefined,
  environmentId: string
): Promise<void> {
  if (!subscriberId) return;

  const config = await getNovuConfig(environmentId);
  if (!config) return;

  try {
    await novuApiRequest("DELETE", `/v1/subscribers/${encodeURIComponent(subscriberId)}`, undefined, config);
    logger.info({ subscriberId, environmentId }, "Deleted subscriber from Novu");
  } catch (error) {
    logger.error(
      { subscriberId, environmentId, error: error instanceof Error ? error.message : String(error) },
      "Failed to delete subscriber from Novu"
    );
  }
}

// --- Internal helpers ---

function mapContactToSubscriber(attributes: Record<string, string>): Record<string, any> {
  const subscriberId = attributes.userId || attributes.email;
  const data: Record<string, string> = {};
  const subscriber: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "userId") continue; // used as subscriberId
    if (NOVU_STANDARD_FIELDS.includes(key)) {
      subscriber[key] = value;
    } else {
      data[key] = value;
    }
  }

  if (Object.keys(data).length > 0) {
    subscriber.data = data;
  }

  return { subscriberId, ...subscriber };
}

function flattenBulkAttributes(
  attrs: Array<{ attributeKey: { key: string }; value: string }>
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const attr of attrs) {
    flat[attr.attributeKey.key] = attr.value;
  }
  return flat;
}

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
