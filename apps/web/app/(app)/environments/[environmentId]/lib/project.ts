import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { ZString } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { TMembership, ZMembership } from "@hivecfm/types/memberships";
import { validateInputs } from "@/lib/utils/validate";

export const getProjectsByUserId = reactCache(
  async (userId: string, orgMembership: TMembership): Promise<{ id: string; name: string }[]> => {
    validateInputs([userId, ZString], [orgMembership, ZMembership]);

    let projectWhereClause: Prisma.ProjectWhereInput = {};

    if (orgMembership.role === "member") {
      projectWhereClause = {
        projectTeams: {
          some: {
            team: {
              teamUsers: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      };
    }

    try {
      const projects = await prisma.project.findMany({
        where: {
          organizationId: orgMembership.organizationId,
          ...projectWhereClause,
        },
        select: {
          id: true,
          name: true,
        },
      });
      return projects;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);
