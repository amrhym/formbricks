import "server-only";
import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";

export const getQuotaLinkCountByQuotaId = reactCache(async (quotaId: string): Promise<number> => {
  try {
    validateInputs([quotaId, ZId]);

    const quotaLinkCount = await prisma.responseQuotaLink.count({
      where: {
        quotaId,
        status: "screenedIn",
      },
    });

    return quotaLinkCount;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
});
