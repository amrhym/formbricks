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

  if (response.status === 409) {
    // Prompt already exists — search for it by name
    const searchRes = await fetch(
      `${environmentUrl}/api/v2/architect/prompts?name=${encodeURIComponent(name)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      const existing = data.entities?.find((p: any) => p.name === name);
      if (existing) return { id: existing.id, name: existing.name };
    }
    throw new Error(`Prompt "${name}" already exists but could not be found`);
  }

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
  // Try to create resource; if it already exists (409), get the existing one instead
  let response = await fetch(`${environmentUrl}/api/v2/architect/prompts/${promptId}/resources`, {
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

  if (response.status === 409) {
    // Resource already exists — delete it and recreate to get a fresh uploadUri
    await fetch(`${environmentUrl}/api/v2/architect/prompts/${promptId}/resources/${language}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // Wait briefly for deletion to propagate
    await new Promise((r) => setTimeout(r, 1000));
    // Recreate
    response = await fetch(`${environmentUrl}/api/v2/architect/prompts/${promptId}/resources`, {
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
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create prompt resource: ${response.status} ${errorText}`);
  }

  const resource = await response.json();
  const uploadUri = resource.uploadUri;

  if (!uploadUri) {
    console.error("Genesys resource created but no uploadUri returned:", JSON.stringify(resource));
    throw new Error(
      `Genesys resource created but no uploadUri returned. Resource: ${JSON.stringify(resource).slice(0, 500)}`
    );
  }

  // Use native FormData (available in Node 18+) for proper multipart upload
  const formData = new FormData();
  const blob = new Blob([wavBuffer], { type: "audio/wav" });
  formData.append("file", blob, `prompt_${promptId}.wav`);

  const uploadResponse = await fetch(uploadUri, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text().catch(() => "");
    throw new Error(`Failed to upload WAV to prompt resource: ${uploadResponse.status} ${errorText}`.trim());
  }

  // Log success for debugging
  console.log(
    `Successfully uploaded WAV to Genesys prompt ${promptId}, uploadUri: ${uploadUri.slice(0, 100)}...`
  );
}
