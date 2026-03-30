"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { ZGoogleAiCredential } from "@hivecfm/types/integration/google-ai";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";

const ZTestGoogleAiConnectionAction = z.object({
  environmentId: ZId,
  credentials: ZGoogleAiCredential,
});

export const testGoogleAiConnectionAction = authenticatedActionClient
  .schema(ZTestGoogleAiConnectionAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    const { apiKey } = parsedInput.credentials;

    // Test the API key by listing voices
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?languageCode=en-US&key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI connection failed: ${error}`);
    }

    const data = await response.json();
    return { success: true, voiceCount: data.voices?.length || 0 };
  });
