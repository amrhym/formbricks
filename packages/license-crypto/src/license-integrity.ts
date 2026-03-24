/**
 * License integrity protection using Ed25519 signatures.
 *
 * The license portal signs license data with a private key.
 * hivecfm-core verifies the signature with the public key.
 * If someone modifies the DB directly, the signature won't match.
 */
import crypto from "crypto";

/**
 * Fields that are protected by the signature.
 * Changing ANY of these in the DB invalidates the license.
 */
export interface LicenseSignableData {
  organizationId: string;
  licenseKey: string;
  maxCompletedResponses: number;
  maxUsers: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  isActive: boolean;
}

/**
 * Build a deterministic canonical string from license data for signing.
 * Sorted keys ensure the same data always produces the same string.
 */
function canonicalize(data: LicenseSignableData): string {
  const sorted: Record<string, string | number | boolean> = {};
  const keys = Object.keys(data).sort() as (keyof LicenseSignableData)[];
  for (const key of keys) {
    sorted[key] = data[key];
  }
  return JSON.stringify(sorted);
}

/**
 * Sign license data with an Ed25519 private key.
 * Returns a base64url-encoded signature.
 *
 * Used by: License Portal (has the private key)
 */
export function signLicenseData(data: LicenseSignableData, privateKeyPem: string): string {
  const message = Buffer.from(canonicalize(data), "utf-8");
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, message, privateKey);
  return signature.toString("base64url");
}

/**
 * Verify a license signature against the data using Ed25519 public key(s).
 * Returns true if the signature is valid for the given data.
 *
 * Used by: hivecfm-core (has only the public key)
 */
export function verifyLicenseData(
  data: LicenseSignableData,
  signature: string,
  publicKeyPems: string[]
): boolean {
  const message = Buffer.from(canonicalize(data), "utf-8");
  const sigBuf = Buffer.from(signature, "base64url");

  for (const pem of publicKeyPems) {
    try {
      const publicKey = crypto.createPublicKey(pem.trim());
      if (crypto.verify(null, message, publicKey, sigBuf)) {
        return true;
      }
    } catch {
      // Try next key
    }
  }

  return false;
}
