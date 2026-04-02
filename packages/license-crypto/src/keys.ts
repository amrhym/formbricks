/**
 * Embedded Ed25519 keypair for HiveCFM license signing/verification.
 * These are the default keys used when env vars are not set.
 * Organizations can override with their own keys via env vars.
 */
export const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQ+aKJUb/47+f8CBYjzCpro9fXV5lumKUyoa2UOVX4QM=
-----END PUBLIC KEY-----`;

export const EMBEDDED_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILVUc4l2xDC9cVwVxY8OurK9lEECHkMlwNPA3zZs3yWR
-----END PRIVATE KEY-----`;
