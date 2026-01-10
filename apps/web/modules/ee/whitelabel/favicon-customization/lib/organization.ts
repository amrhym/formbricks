import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@hivecfm/database";
import { PrismaErrorType } from "@hivecfm/database/types/error";
import { ZId, ZUrl } from "@hivecfm/types/common";
import { ResourceNotFoundError } from "@hivecfm/types/errors";
import { TOrganizationWhitelabel } from "@hivecfm/types/organizations";
import { validateInputs } from "@/lib/utils/validate";

export const updateOrganizationFaviconUrl = async (
  organizationId: string,
  faviconUrl: string | null
): Promise<boolean> => {
  validateInputs([organizationId, ZId], [faviconUrl, ZUrl.nullable()]);

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whitelabel: true },
    });

    if (!organization) {
      throw new ResourceNotFoundError("Organization", organizationId);
    }

    const existingWhitelabel = (organization.whitelabel ?? {}) as TOrganizationWhitelabel;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        whitelabel: {
          ...existingWhitelabel,
          faviconUrl,
        },
      },
    });

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PrismaErrorType.RecordDoesNotExist
    ) {
      throw new ResourceNotFoundError("Organization", organizationId);
    }

    throw error;
  }
};
