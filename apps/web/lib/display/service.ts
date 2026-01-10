import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { ZId } from "@hivecfm/types/common";
import { TDisplay, TDisplayFilters } from "@hivecfm/types/displays";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "../utils/validate";

export const selectDisplay = {
  id: true,
  createdAt: true,
  updatedAt: true,
  surveyId: true,
  contactId: true,
} satisfies Prisma.DisplaySelect;

export const getDisplayCountBySurveyId = reactCache(
  async (surveyId: string, filters?: TDisplayFilters): Promise<number> => {
    validateInputs([surveyId, ZId]);

    try {
      const displayCount = await prisma.display.count({
        where: {
          surveyId: surveyId,
          ...(filters &&
            filters.createdAt && {
              createdAt: {
                gte: filters.createdAt.min,
                lte: filters.createdAt.max,
              },
            }),
        },
      });
      return displayCount;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new DatabaseError(error.message);
      }
      throw error;
    }
  }
);

export const deleteDisplay = async (displayId: string, tx?: Prisma.TransactionClient): Promise<TDisplay> => {
  validateInputs([displayId, ZId]);
  try {
    const prismaClient = tx ?? prisma;
    const display = await prismaClient.display.delete({
      where: {
        id: displayId,
      },
      select: selectDisplay,
    });

    return display;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};
