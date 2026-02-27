import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { hashSecret, hashSha256 } from "@/lib/crypto";
import { n8nClient } from "./client";
import { defaultWorkflowTemplates, parameterizeWorkflow } from "./templates";

/**
 * Check if n8n is reachable. Returns true if healthy, false otherwise.
 */
export const checkN8nHealth = async (): Promise<boolean> => {
  return n8nClient.healthCheck();
};

/**
 * Deploy all default workflow templates for a new tenant.
 */
export const deployWorkflowTemplates = async (
  organizationId: string,
  credentialId?: string
): Promise<void> => {
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
      const parameterized = parameterizeWorkflow(template.workflow, organizationId, credentialId);

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
 * Generate a real HiveCFM API key for a tenant and create the corresponding n8n credential.
 * Returns the n8n credential ID for storage on the Organization.
 */
export const createTenantCredentials = async (
  organizationId: string
): Promise<{ n8nCredentialId: string; apiKeyId: string }> => {
  try {
    // 1. Generate a secure random API key
    const secret = randomBytes(32).toString("base64url");
    const lookupHash = hashSha256(secret);
    const hashedKey = await hashSecret(secret, 12);
    const actualKey = `fbk_${secret}`;

    // 2. Create the ApiKey record scoped to this tenant's organization
    const apiKey = await prisma.apiKey.create({
      data: {
        label: `n8n-integration-${organizationId}`,
        hashedKey,
        lookupHash,
        createdBy: "system",
        organization: { connect: { id: organizationId } },
        organizationAccess: { read: true, write: true, manage: false },
      },
    });

    // 3. Create the n8n credential with the real API key
    const credential = await n8nClient.createCredential({
      name: `HiveCFM API - ${organizationId}`,
      type: "httpHeaderAuth",
      data: {
        name: "x-api-key",
        value: actualKey,
      },
    });

    // 4. Store the n8n credential ID on the organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: { n8nCredentialId: credential.id },
    });

    logger.info(
      { tenantId: organizationId, apiKeyId: apiKey.id, n8nCredentialId: credential.id },
      "n8n credentials created for tenant with real API key"
    );

    return { n8nCredentialId: credential.id, apiKeyId: apiKey.id };
  } catch (error) {
    logger.error({ tenantId: organizationId, error }, "Failed to create n8n credentials");
    throw error;
  }
};

/**
 * Rotate the API key for a tenant's n8n credential.
 * Generates a new key, updates the n8n credential, and revokes the old key.
 */
export const rotateTenantCredentials = async (organizationId: string): Promise<{ apiKeyId: string }> => {
  // 1. Look up the organization's n8n credential ID and existing n8n API key
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { n8nCredentialId: true },
  });

  if (!org.n8nCredentialId) {
    throw new Error(`Organization ${organizationId} has no n8n credential to rotate`);
  }

  // 2. Find the old API key for this integration
  const oldApiKey = await prisma.apiKey.findFirst({
    where: {
      organizationId,
      label: `n8n-integration-${organizationId}`,
    },
    select: { id: true },
  });

  // 3. Generate new API key
  const secret = randomBytes(32).toString("base64url");
  const lookupHash = hashSha256(secret);
  const hashedKey = await hashSecret(secret, 12);
  const actualKey = `fbk_${secret}`;

  const newApiKey = await prisma.apiKey.create({
    data: {
      label: `n8n-integration-${organizationId}`,
      hashedKey,
      lookupHash,
      createdBy: "system",
      organization: { connect: { id: organizationId } },
      organizationAccess: { read: true, write: true, manage: false },
    },
  });

  // 4. Update the n8n credential with the new key
  await n8nClient.updateCredential(org.n8nCredentialId, {
    data: {
      name: "x-api-key",
      value: actualKey,
    },
  });

  // 5. Revoke the old API key
  if (oldApiKey) {
    await prisma.apiKey.delete({ where: { id: oldApiKey.id } });
  }

  logger.info(
    { tenantId: organizationId, newApiKeyId: newApiKey.id, oldApiKeyId: oldApiKey?.id },
    "Tenant n8n credentials rotated"
  );

  return { apiKeyId: newApiKey.id };
};

/**
 * Revoke the API key and delete the n8n credential for a tenant.
 */
export const revokeTenantCredentials = async (organizationId: string): Promise<void> => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { n8nCredentialId: true },
  });

  // Delete the n8n credential
  if (org?.n8nCredentialId) {
    try {
      await n8nClient.deleteCredential(org.n8nCredentialId);
    } catch (err) {
      logger.error(
        { tenantId: organizationId, n8nCredentialId: org.n8nCredentialId, error: err },
        "Failed to delete n8n credential"
      );
    }
    await prisma.organization.update({
      where: { id: organizationId },
      data: { n8nCredentialId: null },
    });
  }

  // Revoke the n8n integration API key
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      organizationId,
      label: `n8n-integration-${organizationId}`,
    },
    select: { id: true },
  });

  if (apiKey) {
    await prisma.apiKey.delete({ where: { id: apiKey.id } });
    logger.info({ tenantId: organizationId, apiKeyId: apiKey.id }, "n8n API key revoked");
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

    // Also revoke credentials when removing workflows
    await revokeTenantCredentials(organizationId);
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
  // Look up the credential ID so we can parameterize templates with it
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { n8nCredentialId: true },
  });

  const parameterized = parameterizeWorkflow(
    template.n8nWorkflow as Record<string, unknown>,
    organizationId,
    org?.n8nCredentialId ?? undefined
  );

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

/**
 * Get credential and workflow status for a tenant (used by management endpoint).
 */
export const getTenantN8nStatus = async (organizationId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { n8nCredentialId: true },
  });

  // Get the n8n integration API key metadata (not the key itself)
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      organizationId,
      label: `n8n-integration-${organizationId}`,
    },
    select: { id: true, createdAt: true, lastUsedAt: true },
  });

  // Get workflows
  let workflows: { id: string; name: string; active: boolean }[] = [];
  try {
    const result = await n8nClient.listWorkflows([`tenant-${organizationId}`]);
    workflows = result.data.map((w) => ({ id: w.id, name: w.name, active: w.active }));
  } catch (err) {
    logger.warn({ tenantId: organizationId, error: err }, "Failed to fetch n8n workflows for status");
  }

  return {
    n8nCredentialId: org?.n8nCredentialId ?? null,
    apiKey: apiKey
      ? {
          id: apiKey.id,
          createdAt: apiKey.createdAt,
          lastUsedAt: apiKey.lastUsedAt,
        }
      : null,
    workflows,
    n8nReachable: await n8nClient.healthCheck(),
  };
};
