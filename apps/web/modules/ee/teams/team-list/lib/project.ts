import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZString } from "@hivecfm/types/common";
import { DatabaseError, UnknownError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";
import { TOrganizationProject } from "@/modules/ee/teams/team-list/types/project";

export const getProjectsByOrganizationId = reactCache(
  async (organizationId: string): Promise<TOrganizationProject[]> => {
    validateInputs([organizationId, ZString]);

    try {
      const projects = await prisma.project.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return projects.map((project) => ({
        id: project.id,
        name: project.name,
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(error, "Error fetching projects by organization id");
        throw new DatabaseError(error.message);
      }

      throw new UnknownError("Error while fetching projects");
    }
  }
);
