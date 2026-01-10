import { Prisma, Project } from "@prisma/client";
import { cache as reactCache } from "react";
import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";

export const getProjectByEnvironmentId = reactCache(
  async (environmentId: string): Promise<Project | null> => {
    validateInputs([environmentId, z.string().cuid2()]);

    let projectPrisma;

    try {
      projectPrisma = await prisma.project.findFirst({
        where: {
          environments: {
            some: {
              id: environmentId,
            },
          },
        },
      });

      return projectPrisma;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(error, "Error fetching project by environment id");
        throw new DatabaseError(error.message);
      }
      throw error;
    }
  }
);
