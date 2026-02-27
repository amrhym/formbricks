import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { DatabaseError } from "@hivecfm/types/errors";

export type TApprovalQueueSurvey = {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  environmentId: string;
  creator: { name: string } | null;
};

export const getSurveysUnderReview = reactCache(
  async (environmentId: string): Promise<TApprovalQueueSurvey[]> => {
    try {
      const surveys = await prisma.survey.findMany({
        where: {
          environmentId,
          status: "underReview",
        },
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          environmentId: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return surveys;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }
      throw error;
    }
  }
);
