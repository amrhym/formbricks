import "server-only";

interface OIDCClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  name: string;
}

const clients: OIDCClient[] = [
  {
    clientId: process.env.OIDC_SUPERSET_CLIENT_ID || "superset-client",
    clientSecret: process.env.OIDC_SUPERSET_CLIENT_SECRET || "",
    redirectUris: [`${process.env.SUPERSET_BASE_URL || "http://localhost:3002"}/oauth-authorized/hivecfm`],
    name: "Apache Superset",
  },
  {
    clientId: process.env.OIDC_N8N_CLIENT_ID || "n8n-client",
    clientSecret: process.env.OIDC_N8N_CLIENT_SECRET || "",
    redirectUris: [`${process.env.N8N_BASE_URL || "http://localhost:5678"}/rest/oauth2-credential/callback`],
    name: "n8n Workflow Automation",
  },
];

/**
 * Validate a client_id and client_secret pair.
 */
export function validateClient(clientId: string, clientSecret: string): OIDCClient | null {
  const client = clients.find((c) => c.clientId === clientId);
  if (!client) return null;
  if (client.clientSecret !== clientSecret) return null;
  return client;
}

/**
 * Validate that a redirect_uri is registered for a client.
 */
export function validateRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = clients.find((c) => c.clientId === clientId);
  if (!client) return false;
  return client.redirectUris.includes(redirectUri);
}

/**
 * Get a client by ID (without exposing the secret).
 */
export function getClient(clientId: string): Omit<OIDCClient, "clientSecret"> | null {
  const client = clients.find((c) => c.clientId === clientId);
  if (!client) return null;
  const { clientSecret: _, ...safe } = client;
  return safe;
}
