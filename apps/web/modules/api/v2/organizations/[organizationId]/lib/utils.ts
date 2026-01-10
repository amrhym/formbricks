import { logger } from "@hivecfm/logger";
import { OrganizationAccessType } from "@hivecfm/types/api-key";
import { TAuthenticationApiKey } from "@hivecfm/types/auth";
import { hasOrganizationAccess } from "@/modules/organization/settings/api-keys/lib/utils";

export const hasOrganizationIdAndAccess = (
  paramOrganizationId: string,
  authentication: TAuthenticationApiKey,
  accessType: OrganizationAccessType
): boolean => {
  if (paramOrganizationId !== authentication.organizationId) {
    logger.error("Organization ID from params does not match the authenticated organization ID");

    return false;
  }

  return hasOrganizationAccess(authentication, accessType);
};
