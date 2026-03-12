import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { hashPassword } from "@/lib/auth";

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
 * Superset 3.x doesn't expose a user management REST API, so we insert directly
 * into its PostgreSQL metadata database (FAB's ab_user / ab_user_role tables).
 */
/**
 * Hash password in werkzeug pbkdf2:sha256 format used by Superset/Flask-AppBuilder.
 */
async function hashWerkzeug(password: string): Promise<string> {
  const crypto = await import("node:crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 600000;
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:sha256:${String(iterations)}$${salt}$${key}`;
}

async function provisionSupersetUser(user: UserProvisioningData): Promise<void> {
  const supersetDbUrl = process.env.SUPERSET_DB_URL;
  if (!supersetDbUrl) {
    logger.warn("SUPERSET_DB_URL not configured, skipping Superset user provisioning");
    return;
  }

  try {
    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || user.email;
    const lastName = nameParts.slice(1).join(" ") || "-";
    const hashedPassword = await hashWerkzeug(user.password);

    const { Client } = await import("pg");
    const client = new Client({ connectionString: supersetDbUrl });
    await client.connect();

    try {
      // Check if user already exists
      const existing = await client.query("SELECT id FROM ab_user WHERE email = $1 LIMIT 1", [user.email]);

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE ab_user SET first_name = $1, last_name = $2, password = $3, changed_on = NOW() WHERE email = $4`,
          [firstName, lastName, hashedPassword, user.email]
        );
        logger.info({ email: user.email }, "Superset user updated");
      } else {
        // Get next ID and Admin role
        const maxIdResult = await client.query("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ab_user");
        const nextId = maxIdResult.rows[0].next_id;
        const roleResult = await client.query("SELECT id FROM ab_role WHERE name = 'Admin' LIMIT 1");
        const adminRoleId = roleResult.rows[0]?.id || 1;

        await client.query(
          `INSERT INTO ab_user (id, first_name, last_name, username, email, password, active, created_on, changed_on, login_count)
           VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW(), 0)`,
          [nextId, firstName, lastName, user.email, user.email, hashedPassword]
        );

        const maxRoleIdResult = await client.query(
          "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ab_user_role"
        );
        const nextRoleId = maxRoleIdResult.rows[0].next_id;

        await client.query(`INSERT INTO ab_user_role (id, user_id, role_id) VALUES ($1, $2, $3)`, [
          nextRoleId,
          nextId,
          adminRoleId,
        ]);

        logger.info({ email: user.email }, "Superset user provisioned");
      }
    } finally {
      await client.end();
    }
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
    const baseUrl = NOVU_API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/v1/subscribers`, {
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
