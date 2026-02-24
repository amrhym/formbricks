import "server-only";
import { Session } from "next-auth";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { OIDCClaims } from "./provider";

/**
 * Map a NextAuth session to OIDC claims.
 * Resolves the user's organization membership to include organizationId and role.
 */
export async function mapSessionToClaims(session: Session): Promise<OIDCClaims | null> {
  if (!session.user?.id) {
    return null;
  }

  try {
    // Get the user's primary organization membership (first one with owner/manager role)
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ["owner", "manager"] },
      },
      select: {
        organizationId: true,
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      logger.warn({ userId: session.user.id }, "No admin/owner membership found for OIDC claims");
      return null;
    }

    return {
      sub: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      organizationId: membership.organizationId,
      role: membership.role,
    };
  } catch (error) {
    logger.error({ userId: session.user.id, error }, "Failed to map session to OIDC claims");
    return null;
  }
}
