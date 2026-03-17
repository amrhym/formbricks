import { TGenesysCloudCredential } from "@hivecfm/types/integration/genesys-cloud";

interface GenesysAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

function getLoginUrl(environmentUrl: string): string {
  const baseUrl = environmentUrl.replace(/\/+$/, "");
  // Convert api.mypurecloud.X to login.mypurecloud.X
  return baseUrl.replace("://api.", "://login.");
}

export async function getAccessToken(credentials: TGenesysCloudCredential): Promise<string> {
  const loginUrl = getLoginUrl(credentials.environmentUrl);
  const tokenUrl = `${loginUrl}/oauth/token`;
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Genesys Cloud: ${response.status} ${errorText}`);
  }

  const data: GenesysAccessToken = await response.json();
  return data.access_token;
}

export async function testConnection(
  credentials: TGenesysCloudCredential
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAccessToken(credentials);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function createPrompt(
  token: string,
  environmentUrl: string,
  name: string,
  description: string
): Promise<{ id: string; name: string }> {
  const response = await fetch(`${environmentUrl}/api/v2/architect/prompts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Genesys prompt: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function uploadPromptResource(
  token: string,
  environmentUrl: string,
  promptId: string,
  wavBuffer: ArrayBuffer,
  language: string = "en-us"
): Promise<void> {
  const response = await fetch(`${environmentUrl}/api/v2/architect/prompts/${promptId}/resources`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language,
      mediaUri: `prompt://${promptId}`,
      ttsString: "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create prompt resource: ${response.status} ${errorText}`);
  }

  const resource = await response.json();
  const uploadUri = resource.uploadUri;

  if (uploadUri) {
    const uploadResponse = await fetch(uploadUri, {
      method: "PUT",
      headers: {
        "Content-Type": "audio/wav",
      },
      body: wavBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload WAV to prompt resource: ${uploadResponse.status}`);
    }
  }
}
