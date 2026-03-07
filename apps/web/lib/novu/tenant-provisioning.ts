import "server-only";
import { logger } from "@hivecfm/logger";
import { IS_NOVU_CONFIGURED, NOVU_API_KEY, NOVU_API_URL } from "@/lib/constants";
import { createOrUpdateIntegration } from "@/lib/integration/service";
import { deleteIntegration, getIntegrationByType } from "@/lib/integration/service";

/**
 * Provision Novu integration records for a new tenant.
 *
 * Creates an Integration record of type "novu" for each environment,
 * storing the global Novu credentials so that per-tenant isolation
 * is tracked via the Integration table.
 */
export async function provisionNovuForTenant(
  organizationId: string,
  environmentIds: string[]
): Promise<void> {
  if (!IS_NOVU_CONFIGURED) {
    logger.warn(
      { organizationId },
      "Novu is not configured, skipping Novu provisioning (graceful degradation)"
    );
    return;
  }

  for (const environmentId of environmentIds) {
    try {
      await createOrUpdateIntegration(environmentId, {
        type: "novu",
        config: {
          key: {
            apiKey: NOVU_API_KEY!,
            apiUrl: NOVU_API_URL,
          },
          data: [],
        },
      });

      logger.info(
        { organizationId, environmentId },
        "Novu integration record created for tenant environment"
      );
    } catch (error) {
      logger.error(
        { organizationId, environmentId, error },
        "Failed to create Novu integration record for environment"
      );
      throw error;
    }
  }
}

/**
 * Deprovision Novu integration records for a tenant.
 * Deletes Integration records of type "novu" for each environment.
 */
export async function deprovisionNovuForTenant(
  organizationId: string,
  environmentIds: string[]
): Promise<void> {
  for (const environmentId of environmentIds) {
    try {
      const integration = await getIntegrationByType(environmentId, "novu");
      if (integration) {
        await deleteIntegration(integration.id);
        logger.info(
          { organizationId, environmentId, integrationId: integration.id },
          "Novu integration record deleted for tenant environment"
        );
      }
    } catch (error) {
      logger.error(
        { organizationId, environmentId, error },
        "Failed to delete Novu integration record for environment"
      );
    }
  }
}
