import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError } from "@hivecfm/types/errors";
import { ZTenantCreateInput } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { deregisterHubTenant, registerHubTenant } from "@/lib/hivecfm-hub/service";
import {
  checkN8nHealth,
  createTenantCredentials,
  deployWorkflowTemplates,
  removeTenantWorkflows,
  revokeTenantCredentials,
} from "@/lib/n8n/service";
import { deprovisionNovuForTenant, provisionNovuForTenant } from "@/lib/novu/tenant-provisioning";
import { createRLSRule, deleteRLSRule } from "@/lib/superset/service";
import { createLicense } from "@/lib/tenant/license";
import { TenantProvisioner } from "@/lib/tenant/provisioning";
import { createTenant, listTenants } from "@/lib/tenant/service";

export const GET = withV1ApiWrapper({
  handler: async (_args: { authentication: NonNullable<TApiKeyAuthentication> }) => {
    try {
      const tenants = await listTenants();
      return {
        response: responses.successResponse(tenants),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const POST = withV1ApiWrapper({
  handler: async ({
    req,
    auditLog,
  }: {
    req: NextRequest;
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    try {
      let body;
      try {
        body = await req.json();
      } catch (error) {
        logger.error({ error, url: req.url }, "Error parsing JSON input");
        return {
          response: responses.badRequestResponse("Malformed JSON input, please check your request body"),
        };
      }

      const inputValidation = ZTenantCreateInput.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const result = await createTenant(inputValidation.data);
      auditLog.targetId = result.organization.id;
      auditLog.newObject = result;

      // Create license if provided in input
      let license = null;
      if (inputValidation.data.license) {
        license = await createLicense(result.organization.id, inputValidation.data.license);
      }

      // Run full provisioning for external services
      const environmentIds = result.project.environments.map((env) => env.id);
      const provisioner = new TenantProvisioner(
        result.organization.id,
        result.organization.name,
        environmentIds,
        { createRLSRule, deleteRLSRule },
        {
          checkN8nHealth,
          deployWorkflowTemplates,
          createTenantCredentials,
          removeTenantWorkflows,
          revokeTenantCredentials,
        },
        { provisionTenant: provisionNovuForTenant, deprovisionTenant: deprovisionNovuForTenant },
        { registerTenant: registerHubTenant, deregisterTenant: deregisterHubTenant }
      );

      try {
        await provisioner.provision();
      } catch (provisionError) {
        logger.error(
          { tenantId: result.organization.id, error: provisionError },
          "Tenant provisioning failed — DB records created but external services may be incomplete"
        );
        // Return the tenant result with a warning — the DB tenant was created successfully
        return {
          response: responses.successResponse({
            ...result,
            ...(license ? { license } : {}),
            provisioningWarning:
              "Tenant created but some external services failed to provision. Check provisioning logs.",
          }),
        };
      }

      return {
        response: responses.successResponse({
          ...result,
          ...(license ? { license } : {}),
        }),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "tenant",
});
