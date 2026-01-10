import { Prisma } from "@prisma/client";
import { cache as reactCache } from "react";
import { prisma } from "@hivecfm/database";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError } from "@hivecfm/types/errors";
import { validateInputs } from "@/lib/utils/validate";
import { TContact } from "@/modules/ee/contacts/types/contact";

export const getContacts = reactCache(async (environmentIds: string[]): Promise<TContact[]> => {
  validateInputs([environmentIds, ZId.array()]);

  try {
    const contacts = await prisma.contact.findMany({
      where: { environmentId: { in: environmentIds } },
    });

    return contacts;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }

    throw error;
  }
});
