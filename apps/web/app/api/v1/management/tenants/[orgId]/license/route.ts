import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { ZTenantLicenseCreate, ZTenantLicenseUpdate } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { createLicense, getLicenseStatus, updateLicense } from "@/lib/tenant/license";

export const GET = withV1ApiWrapper({
  handler: async ({
    props,
  }: {
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;
      const status = await getLicenseStatus(orgId);

      if (!status) {
        return { response: responses.notFoundResponse("TenantLicense", orgId) };
      }

      return { response: responses.successResponse(status) };
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
    props,
  }: {
    req: NextRequest;
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;

      let body;
      try {
        body = await req.json();
      } catch (error) {
        logger.error({ error, url: req.url }, "Error parsing JSON input");
        return {
          response: responses.badRequestResponse("Malformed JSON input, please check your request body"),
        };
      }

      const inputValidation = ZTenantLicenseCreate.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const license = await createLicense(orgId, inputValidation.data);
      auditLog.targetId = orgId;
      auditLog.newObject = license;

      return { response: responses.successResponse(license) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "tenantLicense",
});

export const PATCH = withV1ApiWrapper({
  handler: async ({
    req,
    auditLog,
    props,
  }: {
    req: NextRequest;
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;

      let body;
      try {
        body = await req.json();
      } catch (error) {
        logger.error({ error, url: req.url }, "Error parsing JSON input");
        return {
          response: responses.badRequestResponse("Malformed JSON input, please check your request body"),
        };
      }

      const inputValidation = ZTenantLicenseUpdate.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const updated = await updateLicense(orgId, inputValidation.data);
      auditLog.targetId = orgId;
      auditLog.newObject = updated;

      return { response: responses.successResponse(updated) };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("TenantLicense", "orgId") };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "updated",
  targetType: "tenantLicense",
});
