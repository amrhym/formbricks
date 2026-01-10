import "server-only";
import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZId } from "@hivecfm/types/common";
import { ValidationError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";
import {
  TProjectUpdateBrandingInput,
  ZProjectUpdateBrandingInput,
} from "@/modules/ee/whitelabel/remove-branding/types/project";

export const updateProjectBranding = async (
  projectId: string,
  inputProject: TProjectUpdateBrandingInput
): Promise<boolean> => {
  validateInputs([projectId, ZId], [inputProject, ZProjectUpdateBrandingInput]);
  try {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...inputProject,
      },
      select: {
        id: true,
        organizationId: true,
        environments: {
          select: {
            id: true,
          },
        },
      },
    });

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(error.errors, "Error updating project branding");
    }
    throw new ValidationError("Data validation of project failed");
  }
};
