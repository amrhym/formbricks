import "server-only";
import { logger } from "@hivecfm/logger";
import { supersetClient } from "./client";

/**
 * Create an RLS rule in Superset for a new tenant.
 * This ensures all Superset queries for this tenant are scoped to their data.
 */
export const createRLSRule = async (organizationId: string, orgName: string): Promise<void> => {
  try {
    await supersetClient.apiRequest("POST", "/api/v1/rowlevelsecurity/", {
      name: `tenant_${organizationId}`,
      description: `RLS rule for organization: ${orgName}`,
      filter_type: "Regular",
      clause: `"organizationId" = '${organizationId}'`,
      group_key: organizationId,
    });

    logger.info({ tenantId: organizationId }, "Superset RLS rule created");
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to create Superset RLS rule");
    throw error;
  }
};

/**
 * Delete an RLS rule from Superset when deprovisioning a tenant.
 */
export const deleteRLSRule = async (organizationId: string): Promise<void> => {
  try {
    // List RLS rules to find the one for this org
    const result = (await supersetClient.apiRequest(
      "GET",
      `/api/v1/rowlevelsecurity/?q=(filters:!((col:name,opr:eq,value:tenant_${organizationId})))`
    )) as { result: { id: number }[] };

    if (result.result && result.result.length > 0) {
      const ruleId = result.result[0].id;
      await supersetClient.apiRequest("DELETE", `/api/v1/rowlevelsecurity/${ruleId}`);
      logger.info({ tenantId: organizationId }, "Superset RLS rule deleted");
    }
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to delete Superset RLS rule");
    throw error;
  }
};
