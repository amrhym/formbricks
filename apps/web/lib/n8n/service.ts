import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { n8nClient } from "./client";
import { defaultWorkflowTemplates, parameterizeWorkflow } from "./templates";

/**
 * Deploy all default workflow templates for a new tenant.
 */
export const deployWorkflowTemplates = async (organizationId: string): Promise<void> => {
  try {
    // Get templates from database, or fall back to defaults
    const dbTemplates = await prisma.workflowTemplate.findMany({
      where: { isDefault: true },
    });

    const templates =
      dbTemplates.length > 0
        ? dbTemplates.map((t) => ({
            name: t.name,
            workflow: t.n8nWorkflow as Record<string, unknown>,
          }))
        : Object.entries(defaultWorkflowTemplates).map(([name, workflow]) => ({
            name,
            workflow: workflow as Record<string, unknown>,
          }));

    // Create a tag for this tenant's workflows
    let tag;
    try {
      tag = await n8nClient.createTag(`tenant-${organizationId}`);
    } catch {
      // Tag might already exist
      logger.debug({ tenantId: organizationId }, "Tenant tag may already exist");
    }

    for (const template of templates) {
      const parameterized = parameterizeWorkflow(template.workflow, organizationId);

      const workflow = await n8nClient.createWorkflow({
        ...parameterized,
        name: `${template.name} - ${organizationId}`,
        ...(tag && { tags: [{ id: tag.id, name: tag.name }] }),
      });

      await n8nClient.activateWorkflow(workflow.id);

      logger.info(
        { tenantId: organizationId, workflowId: workflow.id, template: template.name },
        "Workflow deployed for tenant"
      );
    }
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to deploy workflow templates");
    throw error;
  }
};

/**
 * Create tenant-specific credentials in n8n (e.g., HiveCFM API key).
 */
export const createTenantCredentials = async (organizationId: string): Promise<void> => {
  try {
    await n8nClient.createCredential({
      name: `HiveCFM API - ${organizationId}`,
      type: "httpHeaderAuth",
      data: {
        name: "x-api-key",
        value: `tenant-credential-placeholder-${organizationId}`,
      },
    });

    logger.info({ tenantId: organizationId }, "n8n credentials created for tenant");
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to create n8n credentials");
    throw error;
  }
};

/**
 * Remove all workflows and credentials for a tenant.
 */
export const removeTenantWorkflows = async (organizationId: string): Promise<void> => {
  try {
    const { data: workflows } = await n8nClient.listWorkflows([`tenant-${organizationId}`]);

    for (const workflow of workflows) {
      try {
        await n8nClient.deactivateWorkflow(workflow.id);
        await n8nClient.deleteWorkflow(workflow.id);
        logger.info({ tenantId: organizationId, workflowId: workflow.id }, "Workflow removed for tenant");
      } catch (err) {
        logger.error(
          { tenantId: organizationId, workflowId: workflow.id, error: err },
          "Failed to remove workflow"
        );
      }
    }
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to remove tenant workflows");
    throw error;
  }
};

/**
 * Deploy a specific workflow template for a tenant (called from API route).
 */
export const deployWorkflowForTenant = async (
  organizationId: string,
  template: { id: string; name: string; n8nWorkflow: unknown; eventType: string }
): Promise<{ workflowId: string; name: string; eventType: string }> => {
  const parameterized = parameterizeWorkflow(template.n8nWorkflow as Record<string, unknown>, organizationId);

  const workflow = await n8nClient.createWorkflow({
    ...parameterized,
    name: `${template.name} - ${organizationId}`,
  });

  await n8nClient.activateWorkflow(workflow.id);

  logger.info(
    { tenantId: organizationId, workflowId: workflow.id, template: template.name },
    "Individual workflow deployed for tenant"
  );

  return {
    workflowId: workflow.id,
    name: template.name,
    eventType: template.eventType,
  };
};

/**
 * Remove a specific workflow for a tenant (called from API route).
 */
export const removeWorkflowForTenant = async (organizationId: string, workflowId: string): Promise<void> => {
  await n8nClient.deactivateWorkflow(workflowId);
  await n8nClient.deleteWorkflow(workflowId);

  logger.info({ tenantId: organizationId, workflowId }, "Workflow removed for tenant");
};
