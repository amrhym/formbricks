import { z } from "zod";
import { ZInvite } from "@hivecfm/database/zod/invites";

export const ZInviteUpdateInput = ZInvite.pick({
  role: true,
});

export type TInviteUpdateInput = z.infer<typeof ZInviteUpdateInput>;
