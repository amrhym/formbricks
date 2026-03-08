import crypto from "crypto";
import { type TOfflineLicensePayload, ZOfflineLicensePayload } from "./types";

export type LicenseTokenErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_SIGNATURE"
  | "INVALID_PAYLOAD"
  | "UNSUPPORTED_VERSION";

export class LicenseTokenError extends Error {
  public readonly code: LicenseTokenErrorCode;

  constructor(code: LicenseTokenErrorCode, message: string) {
    super(message);
    this.name = "LicenseTokenError";
    this.code = code;
  }
}

function fromBase64Url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function verifyLicenseToken(token: string, publicKeyPems: string[]): TOfflineLicensePayload {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new LicenseTokenError("INVALID_FORMAT", "Token must be in the format <payload>.<signature>");
  }

  const payloadBuf = fromBase64Url(parts[0]);
  const signatureBuf = fromBase64Url(parts[1]);

  let signatureValid = false;
  for (const pem of publicKeyPems) {
    try {
      const publicKey = crypto.createPublicKey(pem.trim());
      if (crypto.verify(null, payloadBuf, publicKey, signatureBuf)) {
        signatureValid = true;
        break;
      }
    } catch {
      // Try next key
    }
  }

  if (!signatureValid) {
    throw new LicenseTokenError("INVALID_SIGNATURE", "Token signature is invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBuf.toString("utf-8"));
  } catch {
    throw new LicenseTokenError("INVALID_PAYLOAD", "Token payload is not valid JSON");
  }

  if (typeof parsed === "object" && parsed !== null && "v" in parsed && (parsed as any).v !== 1) {
    throw new LicenseTokenError(
      "UNSUPPORTED_VERSION",
      `Unsupported token version: ${(parsed as any).v}. Expected version 1.`
    );
  }

  const result = ZOfflineLicensePayload.safeParse(parsed);
  if (!result.success) {
    throw new LicenseTokenError(
      "INVALID_PAYLOAD",
      `Invalid token payload: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return result.data;
}
