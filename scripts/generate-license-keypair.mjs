#!/usr/bin/env node
import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("=== Ed25519 License Signing Key Pair ===\n");

console.log("PRIVATE KEY (set as HIVELIC_SIGNING_PRIVATE_KEY in license-portal .env):");
console.log("------------------------------------------------------------------------");
console.log(privateKey.trim());
console.log();

console.log("PUBLIC KEY (set as HIVECFM_LICENSE_PUBLIC_KEY in hivecfm-core .env):");
console.log("--------------------------------------------------------------------");
console.log(publicKey.trim());
console.log();

console.log("For .env files, use single-line format with literal \\n:");
console.log();
console.log(`HIVELIC_SIGNING_PRIVATE_KEY="${privateKey.trim().replace(/\n/g, "\\n")}"`);
console.log();
console.log(`HIVECFM_LICENSE_PUBLIC_KEY="${publicKey.trim().replace(/\n/g, "\\n")}"`);
