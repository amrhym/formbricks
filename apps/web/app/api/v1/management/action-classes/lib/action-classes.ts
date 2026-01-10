"use server";

import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { TActionClass } from "@hivecfm/types/action-classes";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";

const selectActionClass = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  description: true,
  type: true,
  key: true,
  noCodeConfig: true,
  environmentId: true,
} satisfies Prisma.ActionClassSelect;

export const getActionClasses = reactCache(async (environmentIds: string[]): Promise<TActionClass[]> => {
  validateInputs([environmentIds, ZId.array()]);

  try {
    return await prisma.actionClass.findMany({
      where: {
        environmentId: { in: environmentIds },
      },
      select: selectActionClass,
      orderBy: {
        createdAt: "asc",
      },
    });
  } catch (error) {
    throw new DatabaseError(`Database error when fetching actions for environment ${environmentIds}`);
  }
});
