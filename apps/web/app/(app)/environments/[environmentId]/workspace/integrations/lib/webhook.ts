import { Prisma, Webhook } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";

export const getWebhookCountBySource = async (
  environmentId: string,
  source?: Webhook["source"]
): Promise<number> => {
  validateInputs([environmentId, ZId], [source, z.string().optional()]);

  try {
    const count = await prisma.webhook.count({
      where: {
        environmentId,
        source,
      },
    });
    return count;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
};
