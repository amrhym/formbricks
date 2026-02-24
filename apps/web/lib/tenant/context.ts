import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

/**
 * Execute a function within a tenant-scoped database context.
 * Uses SET LOCAL which is transaction-scoped and auto-resets when the transaction ends.
 */
export async function withTenantContext<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${organizationId}'`);
    logger.debug({ tenantId: organizationId }, "Tenant context set for transaction");
    return fn();
  });
}
