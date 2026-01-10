import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { ZString } from "@hivecfm/types/common";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";

export const getOrganizationsByUserId = reactCache(
  async (userId: string): Promise<{ id: string; name: string }[]> => {
    validateInputs([userId, ZString]);

    try {
      const organizations = await prisma.organization.findMany({
        where: {
          memberships: {
            some: {
              userId,
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      if (!organizations) {
        throw new ResourceNotFoundError("Organizations by UserId", userId);
      }
      return organizations;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }

      throw error;
    }
  }
);
