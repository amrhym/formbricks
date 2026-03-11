import "server-only";
import * as crypto from "crypto";
import { logger } from "@hivecfm/logger";

const OIDC_ISSUER_URL =
  process.env.OIDC_ISSUER_URL ||
  "https://hivecfm-core.graypond-ce0467a0.westeurope.azurecontainerapps.io/api/oidc";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

// In-memory authorization code store (short-lived, 5 min TTL)
const authorizationCodes = new Map<
  string,
  { sub: string; claims: OIDCClaims; expiresAt: number; clientId: string; redirectUri: string }
>();

export interface OIDCClaims {
  sub: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
}

/**
 * Generate a signed JWT using HMAC-SHA256 (symmetric signing with NEXTAUTH_SECRET).
 * For production, replace with RSA signing using OIDC_SIGNING_KEY_PATH.
 */
export function signJwt(payload: Record<string, unknown>, expiresInSeconds: number = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iss: OIDC_ISSUER_URL,
    iat: now,
    exp: now + expiresInSeconds,
    jti: crypto.randomUUID(),
  };

  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", NEXTAUTH_SECRET)
    .update(`${header}.${payloadEncoded}`)
    .digest("base64url");

  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Verify a JWT signature.
 */
export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", NEXTAUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Issue an authorization code for the OIDC authorization code flow.
 */
export function issueAuthorizationCode(claims: OIDCClaims, clientId: string, redirectUri: string): string {
  const code = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  authorizationCodes.set(code, { sub: claims.sub, claims, expiresAt, clientId, redirectUri });

  // Clean expired codes
  for (const [key, value] of authorizationCodes.entries()) {
    if (value.expiresAt < Date.now()) {
      authorizationCodes.delete(key);
    }
  }

  logger.info({ sub: claims.sub, clientId }, "Authorization code issued");
  return code;
}

/**
 * Exchange an authorization code for tokens.
 */
export function exchangeAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string
): { idToken: string; accessToken: string } | null {
  const codeData = authorizationCodes.get(code);

  if (!codeData) {
    logger.warn({ clientId }, "Authorization code not found");
    return null;
  }

  if (codeData.expiresAt < Date.now()) {
    authorizationCodes.delete(code);
    logger.warn({ clientId }, "Authorization code expired");
    return null;
  }

  if (codeData.clientId !== clientId || codeData.redirectUri !== redirectUri) {
    logger.warn({ clientId }, "Authorization code client/redirect mismatch");
    return null;
  }

  // Delete used code (one-time use)
  authorizationCodes.delete(code);

  const idToken = signJwt({
    sub: codeData.claims.sub,
    email: codeData.claims.email,
    name: codeData.claims.name,
    organization_id: codeData.claims.organizationId,
    role: codeData.claims.role,
    aud: clientId,
  });

  const accessToken = signJwt({
    sub: codeData.claims.sub,
    scope: "openid profile email",
    aud: clientId,
  });

  return { idToken, accessToken };
}

/**
 * Get the OIDC discovery document.
 */
export function getDiscoveryDocument() {
  return {
    issuer: OIDC_ISSUER_URL,
    authorization_endpoint: `${OIDC_ISSUER_URL}/authorize`,
    token_endpoint: `${OIDC_ISSUER_URL}/token`,
    userinfo_endpoint: `${OIDC_ISSUER_URL}/userinfo`,
    jwks_uri: `${OIDC_ISSUER_URL}/jwks`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    claims_supported: ["sub", "email", "name", "organization_id", "role"],
  };
}
