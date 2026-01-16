/**
 * Metabase Embedding Utilities
 *
 * Generates signed JWT tokens for secure Metabase dashboard embedding.
 * @see https://www.metabase.com/docs/latest/embedding/signed-embedding
 */
import { SignJWT } from "jose";

const METABASE_SITE_URL = process.env.METABASE_URL || "https://hivecfm.xcai.io/analytics/metabase";
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY || "";

interface MetabaseEmbedParams {
  /** Dashboard ID to embed */
  dashboard?: number;
  /** Question/Card ID to embed */
  question?: number;
  /** Parameters to pass to the dashboard/question */
  params?: Record<string, string | number | null>;
  /** Expiration time in minutes (default: 10) */
  expMinutes?: number;
}

/**
 * Generate a signed JWT token for Metabase embedding
 */
export async function generateMetabaseToken({
  dashboard,
  question,
  params = {},
  expMinutes = 10,
}: MetabaseEmbedParams): Promise<string> {
  if (!METABASE_SECRET_KEY) {
    throw new Error("METABASE_SECRET_KEY is not configured");
  }

  if (!dashboard && !question) {
    throw new Error("Either dashboard or question ID must be provided");
  }

  const resource = dashboard ? { dashboard } : { question };

  const secret = new TextEncoder().encode(METABASE_SECRET_KEY);

  const token = await new SignJWT({
    resource,
    params,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(`${expMinutes}m`)
    .sign(secret);

  return token;
}

/**
 * Generate the full embed URL for a Metabase dashboard
 */
export async function getMetabaseDashboardUrl(
  dashboardId: number,
  params?: Record<string, string | number | null>
): Promise<string> {
  const token = await generateMetabaseToken({
    dashboard: dashboardId,
    params,
  });

  return `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=false&titled=false`;
}

/**
 * Generate the full embed URL for a Metabase question
 */
export async function getMetabaseQuestionUrl(
  questionId: number,
  params?: Record<string, string | number | null>
): Promise<string> {
  const token = await generateMetabaseToken({
    question: questionId,
    params,
  });

  return `${METABASE_SITE_URL}/embed/question/${token}#bordered=false&titled=false`;
}

/**
 * Get the base Metabase URL for direct access
 */
export function getMetabaseBaseUrl(): string {
  return METABASE_SITE_URL;
}
