import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { hashPassword } from "@/lib/auth";
import { supersetClient } from "@/lib/superset/client";

const NOVU_API_URL = process.env.NOVU_API_URL;
const NOVU_API_KEY = process.env.NOVU_API_KEY;

interface UserProvisioningData {
  id: string;
  email: string;
  name: string;
  password: string; // plain-text password (before hashing) for external systems
}

/**
 * Provision a user in Superset.
 * Creates an actual user account so they can log in directly.
 */
async function provisionSupersetUser(user: UserProvisioningData): Promise<void> {
  try {
    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || user.email;
    const lastName = nameParts.slice(1).join(" ") || "-";

    // First, look up the "Gamma" role ID (standard viewer role in Superset)
    const rolesResponse = (await supersetClient.apiRequest("GET", "/api/v1/security/roles/")) as {
      result: { id: number; name: string }[];
    };
    const gammaRole = rolesResponse.result?.find((r) => r.name === "Gamma");
    const roleId = gammaRole?.id || 4; // Gamma is typically ID 4

    await supersetClient.apiRequest("POST", "/api/v1/security/users/", {
      first_name: firstName,
      last_name: lastName,
      username: user.email,
      email: user.email,
      password: user.password,
      active: true,
      roles: [roleId],
    });

    logger.info({ email: user.email }, "Superset user provisioned");
  } catch (error) {
    logger.error({ email: user.email, error }, "Superset user provisioning failed (non-blocking)");
  }
}

/**
 * Provision a user in n8n.
 * n8n shares the same PostgreSQL database, so we insert directly into its user table.
 * Uses the same bcrypt password hash so the same credentials work.
 */
async function provisionN8nUser(user: UserProvisioningData): Promise<void> {
  try {
    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || user.email;
    const lastName = nameParts.slice(1).join(" ") || "";
    const hashedPassword = await hashPassword(user.password);

    // Check if user already exists in n8n
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
      user.email
    );

    if (existing.length > 0) {
      // Update the existing n8n owner user with our credentials
      await prisma.$executeRawUnsafe(
        `UPDATE "user" SET email = $1, "firstName" = $2, "lastName" = $3, password = $4, "updatedAt" = NOW() WHERE id = $5`,
        user.email,
        firstName,
        lastName,
        hashedPassword,
        existing[0].id
      );
      logger.info({ email: user.email }, "n8n user updated");
    } else {
      // Check if there's an owner without email (initial n8n setup)
      const emptyOwner = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "user" WHERE email IS NULL OR email = '' LIMIT 1`
      );

      if (emptyOwner.length > 0) {
        // Update the empty owner with our credentials
        await prisma.$executeRawUnsafe(
          `UPDATE "user" SET email = $1, "firstName" = $2, "lastName" = $3, password = $4, "roleSlug" = 'global:owner', "updatedAt" = NOW() WHERE id = $5`,
          user.email,
          firstName,
          lastName,
          hashedPassword,
          emptyOwner[0].id
        );
        logger.info({ email: user.email }, "n8n owner user configured");
      } else {
        // Insert new user as member
        await prisma.$executeRawUnsafe(
          `INSERT INTO "user" (email, "firstName", "lastName", password, "roleSlug", disabled, "mfaEnabled") VALUES ($1, $2, $3, $4, 'global:owner', false, false)`,
          user.email,
          firstName,
          lastName,
          hashedPassword
        );
        logger.info({ email: user.email }, "n8n user provisioned");
      }
    }
  } catch (error) {
    logger.error({ email: user.email, error }, "n8n user provisioning failed (non-blocking)");
  }
}

/**
 * Provision a subscriber in Novu.
 * Creates a subscriber so they can receive notifications.
 */
async function provisionNovuSubscriber(user: UserProvisioningData): Promise<void> {
  if (!NOVU_API_URL || !NOVU_API_KEY) {
    logger.warn("Novu not configured, skipping subscriber provisioning");
    return;
  }

  try {
    const baseUrl = NOVU_API_URL.replace(/\/api$/, "");
    const response = await fetch(`${baseUrl}/api/v1/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${NOVU_API_KEY}`,
      },
      body: JSON.stringify({
        subscriberId: user.id,
        email: user.email,
        firstName: user.name.split(" ")[0] || user.email,
        lastName: user.name.split(" ").slice(1).join(" ") || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, "Novu subscriber creation failed");
      return;
    }

    logger.info({ email: user.email }, "Novu subscriber provisioned");
  } catch (error) {
    logger.error({ email: user.email, error }, "Novu subscriber provisioning failed (non-blocking)");
  }
}

/**
 * Provision a user across all external systems.
 * Called after user creation in hivecfm-core.
 * All operations are non-blocking — failures are logged but don't break the main flow.
 */
export async function provisionExternalUser(user: UserProvisioningData): Promise<void> {
  await Promise.allSettled([
    provisionSupersetUser(user),
    provisionN8nUser(user),
    provisionNovuSubscriber(user),
  ]);
}
