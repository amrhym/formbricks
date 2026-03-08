"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { activateOfflineLicense } from "@/lib/tenant/offline-license";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";

const ZActivateOfflineLicenseAction = z.object({
  organizationId: ZId,
  token: z.string().min(1),
});

export const activateOfflineLicenseAction = authenticatedActionClient
  .schema(ZActivateOfflineLicenseAction)
  .action(
    async ({
      ctx,
      parsedInput,
    }: {
      ctx: AuthenticatedActionClientCtx;
      parsedInput: z.infer<typeof ZActivateOfflineLicenseAction>;
    }) => {
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId: parsedInput.organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
        ],
      });

      const license = await activateOfflineLicense(parsedInput.token);
      return license;
    }
  );
