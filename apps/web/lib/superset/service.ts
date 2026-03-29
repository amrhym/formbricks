import "server-only";
import { logger } from "@hivecfm/logger";
import { supersetClient } from "./client";

// Gamma role ID in Superset - used for dashboard viewer access
const SUPERSET_GAMMA_ROLE_ID = 4;

/**
 * Get all dataset IDs from Superset.
 * RLS rules must reference specific datasets to apply.
 */
async function getAllDatasetIds(): Promise<number[]> {
  const result = (await supersetClient.apiRequest("GET", "/api/v1/dataset/?q=(page_size:200)")) as {
    result: { id: number }[];
  };
  return result.result.map((d) => d.id);
}

/**
 * Create an RLS rule in Superset for a new tenant.
 * This ensures all Superset queries for this tenant are scoped to their data.
 */
export const createRLSRule = async (organizationId: string, orgName: string): Promise<void> => {
  try {
    const datasetIds = await getAllDatasetIds();
    await supersetClient.apiRequest("POST", "/api/v1/rowlevelsecurity/", {
      name: `tenant_${organizationId}`,
      description: `RLS rule for organization: ${orgName}`,
      filter_type: "Regular",
      clause: `"organizationId" = '${organizationId}'`,
      group_key: organizationId,
      tables: datasetIds,
      roles: [SUPERSET_GAMMA_ROLE_ID],
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
