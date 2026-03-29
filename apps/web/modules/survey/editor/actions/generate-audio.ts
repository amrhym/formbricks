"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { z } from "zod";
import { createS3Client, getActiveBucketName } from "@hivecfm/storage";
import { ZId } from "@hivecfm/types/common";
import { isGoogleTtsConfigured, listVoices, synthesizeSpeech } from "@/lib/google-tts/client";
import { initStorageFromDB } from "@/lib/storage/client";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";

const ZGenerateAudioAction = z.object({
  environmentId: ZId,
  scriptText: z.string().min(1),
  languageCode: z.string().min(2),
  voiceName: z.string().min(1),
  fileName: z.string().min(1),
});

export const generateAudioAction = authenticatedActionClient
  .schema(ZGenerateAudioAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    const wavBuffer = await synthesizeSpeech({
      text: parsedInput.scriptText,
      languageCode: parsedInput.languageCode,
      voiceName: parsedInput.voiceName,
    });

    const hash = crypto
      .createHash("sha256")
      .update(`${parsedInput.scriptText}|${parsedInput.voiceName}|${parsedInput.languageCode}`)
      .digest("hex");

    await initStorageFromDB();
    const s3Client = createS3Client();
    const bucket = getActiveBucketName();
    if (!s3Client || !bucket) throw new Error("Storage not configured");

    const key = `${parsedInput.environmentId}/public/${parsedInput.fileName}`;
    await s3Client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: wavBuffer, ContentType: "audio/wav" })
    );

    const fileUrl = `/storage/${parsedInput.environmentId}/public/${encodeURIComponent(parsedInput.fileName)}`;
    return { fileUrl, hash };
  });

export const listTtsVoicesAction = authenticatedActionClient
  .schema(z.object({ languageCode: z.string().optional() }))
  .action(async ({ parsedInput }) => {
    const voices = await listVoices(parsedInput.languageCode);
    return { voices };
  });

export const checkTtsConfiguredAction = authenticatedActionClient.schema(z.object({})).action(async () => {
  const configured = await isGoogleTtsConfigured();
  return { configured };
});
