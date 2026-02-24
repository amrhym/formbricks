import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@hivecfm/logger";
import { mapSessionToClaims } from "@/lib/oidc/claims";
import { validateRedirectUri } from "@/lib/oidc/clients";
import { issueAuthorizationCode } from "@/lib/oidc/provider";
import { authOptions } from "@/modules/auth/lib/authOptions";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");

  // Validate required params
  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing or invalid parameters" },
      { status: 400 }
    );
  }

  // Validate redirect URI
  if (!validateRedirectUri(clientId, redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Invalid redirect_uri" },
      { status: 400 }
    );
  }

  // Check session
  const session = await getServerSession(authOptions);
  if (!session) {
    // Redirect to login with return URL
    const loginUrl = new URL("/auth/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Map session to OIDC claims
  const claims = await mapSessionToClaims(session);
  if (!claims) {
    return NextResponse.json(
      { error: "access_denied", error_description: "User does not have admin/owner role" },
      { status: 403 }
    );
  }

  // Issue authorization code
  const code = issueAuthorizationCode(claims, clientId, redirectUri);

  // Redirect back with code
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  if (state) {
    callbackUrl.searchParams.set("state", state);
  }

  logger.info({ clientId, sub: claims.sub }, "OIDC authorization code issued");
  return NextResponse.redirect(callbackUrl);
}
