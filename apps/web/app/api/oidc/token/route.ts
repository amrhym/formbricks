import { NextRequest, NextResponse } from "next/server";
import { logger } from "@hivecfm/logger";
import { validateClient } from "@/lib/oidc/clients";
import { exchangeAuthorizationCode } from "@/lib/oidc/provider";

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  } else {
    body = await req.json();
  }

  const { grant_type, code, redirect_uri, client_id, client_secret } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  if (!code || !redirect_uri || !client_id || !client_secret) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Validate client credentials
  const client = validateClient(client_id, client_secret);
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Exchange code for tokens
  const tokens = exchangeAuthorizationCode(code, client_id, redirect_uri);
  if (!tokens) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400 }
    );
  }

  logger.info({ clientId: client_id }, "OIDC tokens issued");

  return NextResponse.json({
    access_token: tokens.accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: tokens.idToken,
  });
}
