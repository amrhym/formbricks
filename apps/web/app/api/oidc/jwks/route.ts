import { NextResponse } from "next/server";

/**
 * JWKS endpoint.
 * Currently using HMAC-SHA256 (symmetric), so JWKS returns an empty keys array.
 * When migrating to RSA signing, the public key will be exposed here.
 */
export async function GET() {
  return NextResponse.json(
    {
      keys: [],
      _note:
        "Using symmetric signing (HS256). JWKS will contain RSA public key after migration to asymmetric signing.",
    },
    {
      headers: { "Cache-Control": "public, max-age=3600" },
    }
  );
}
