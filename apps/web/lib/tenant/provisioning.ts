import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { TProvisioningStep } from "@hivecfm/types/tenant";

interface SupersetClient {
  createRLSRule(organizationId: string, orgName: string): Promise<void>;
  deleteRLSRule(organizationId: string): Promise<void>;
}

interface N8nClient {
  checkN8nHealth(): Promise<boolean>;
  deployWorkflowTemplates(organizationId: string, credentialId?: string): Promise<void>;
  createTenantCredentials(organizationId: string): Promise<{ n8nCredentialId: string; apiKeyId: string }>;
  removeTenantWorkflows(organizationId: string): Promise<void>;
  revokeTenantCredentials(organizationId: string): Promise<void>;
}

interface ProvisioningStep {
  name: TProvisioningStep;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

export class TenantProvisioner {
  private organizationId: string;
  private organizationName: string;
  private supersetClient: SupersetClient;
  private n8nClient: N8nClient;
  private completedSteps: TProvisioningStep[] = [];

  constructor(
    organizationId: string,
    organizationName: string,
    supersetClient: SupersetClient,
    n8nClient: N8nClient
  ) {
    this.organizationId = organizationId;
    this.organizationName = organizationName;
    this.supersetClient = supersetClient;
    this.n8nClient = n8nClient;
  }

  private async logStep(step: TProvisioningStep, status: string, details?: Record<string, unknown>) {
    await prisma.tenantProvisioningLog.create({
      data: {
        organizationId: this.organizationId,
        step,
        status,
        details: details ?? undefined,
      },
    });
  }

  async provision(): Promise<void> {
    const steps: ProvisioningStep[] = [
      {
        name: "INITIATED",
        execute: async () => {
          await this.logStep("INITIATED", "COMPLETED");
        },
        compensate: async () => {},
      },
      {
        name: "DB_CREATED",
        execute: async () => {
          // DB resources (org, project, envs) already created by createTenant()
          await this.logStep("DB_CREATED", "COMPLETED");
        },
        compensate: async () => {
          await this.logStep("DB_CREATED", "COMPENSATED");
        },
      },
      {
        name: "SUPERSET_CONFIGURED",
        execute: async () => {
          await this.supersetClient.createRLSRule(this.organizationId, this.organizationName);
          await this.logStep("SUPERSET_CONFIGURED", "COMPLETED");
        },
        compensate: async () => {
          try {
            await this.supersetClient.deleteRLSRule(this.organizationId);
          } catch (err) {
            logger.error({ tenantId: this.organizationId, error: err }, "Failed to compensate Superset");
          }
          await this.logStep("SUPERSET_CONFIGURED", "COMPENSATED");
        },
      },
      {
        name: "N8N_CONFIGURED",
        execute: async () => {
          // Health check: if n8n is down, log warning but don't fail provisioning
          const n8nHealthy = await this.n8nClient.checkN8nHealth();
          if (!n8nHealthy) {
            logger.warn(
              { tenantId: this.organizationId },
              "n8n is not reachable, skipping n8n configuration (graceful degradation)"
            );
            await this.logStep("N8N_CONFIGURED", "COMPLETED", {
              skipped: true,
              reason: "n8n unreachable",
            });
            return;
          }

          const { n8nCredentialId } = await this.n8nClient.createTenantCredentials(this.organizationId);
          await this.n8nClient.deployWorkflowTemplates(this.organizationId, n8nCredentialId);
          await this.logStep("N8N_CONFIGURED", "COMPLETED", { n8nCredentialId });
        },
        compensate: async () => {
          try {
            await this.n8nClient.removeTenantWorkflows(this.organizationId);
          } catch (err) {
            logger.error({ tenantId: this.organizationId, error: err }, "Failed to compensate n8n workflows");
          }
          try {
            await this.n8nClient.revokeTenantCredentials(this.organizationId);
          } catch (err) {
            logger.error(
              { tenantId: this.organizationId, error: err },
              "Failed to compensate n8n credentials"
            );
          }
          await this.logStep("N8N_CONFIGURED", "COMPENSATED");
        },
      },
      {
        name: "COMPLETED",
        execute: async () => {
          await this.logStep("COMPLETED", "COMPLETED");
        },
        compensate: async () => {},
      },
    ];

    for (const step of steps) {
      try {
        logger.info({ tenantId: this.organizationId, step: step.name }, "Executing provisioning step");
        await step.execute();
        this.completedSteps.push(step.name);
      } catch (error) {
        logger.error(
          { tenantId: this.organizationId, step: step.name, error },
          "Provisioning step failed, starting compensation"
        );
        await this.logStep(step.name, "FAILED", { error: String(error) });

        // Compensate in reverse order
        for (const completedStep of [...this.completedSteps].reverse()) {
          const stepDef = steps.find((s) => s.name === completedStep);
          if (stepDef) {
            try {
              await stepDef.compensate();
            } catch (compensateError) {
              logger.error(
                { tenantId: this.organizationId, step: completedStep, error: compensateError },
                "Compensation step failed"
              );
            }
          }
        }

        throw error;
      }
    }

    logger.info({ tenantId: this.organizationId }, "Tenant provisioning completed successfully");
  }
}
