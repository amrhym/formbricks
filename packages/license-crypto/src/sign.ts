import crypto from "crypto";
import type { TOfflineLicensePayload } from "./types";

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function signLicenseToken(payload: TOfflineLicensePayload, privateKeyPem: string): string {
  const jsonStr = JSON.stringify(payload, Object.keys(payload).sort());
  const payloadBuf = Buffer.from(jsonStr, "utf-8");
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, payloadBuf, privateKey);
  return `${toBase64Url(payloadBuf)}.${toBase64Url(signature)}`;
}
