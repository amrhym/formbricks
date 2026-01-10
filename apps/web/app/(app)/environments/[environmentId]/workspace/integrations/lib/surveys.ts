import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { selectSurvey } from "@/lib/survey/service";
import { transformPrismaSurvey } from "@/lib/survey/utils";
import { validateInputs } from "@/lib/utils/validate";

export const getSurveys = reactCache(async (environmentId: string): Promise<TSurvey[]> => {
  validateInputs([environmentId, ZId]);

  try {
    const surveysPrisma = await prisma.survey.findMany({
      where: {
        environmentId,
        status: {
          not: "completed",
        },
      },
      select: selectSurvey,
      orderBy: {
        updatedAt: "desc",
      },
    });

    return surveysPrisma.map((surveyPrisma) => transformPrismaSurvey<TSurvey>(surveyPrisma));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error({ error }, "getSurveys: Could not fetch surveys");
      throw new DatabaseError(error.message);
    }
    throw error;
  }
});
