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

const ZBatchGenerateAudioAction = z.object({
  environmentId: ZId,
  elements: z.array(
    z.object({
      elementId: z.string(),
      scriptText: z.string(),
      currentHash: z.string().optional(),
    })
  ),
  languageCode: z.string().min(2),
  voiceName: z.string().min(1),
});

export const batchGenerateAudioAction = authenticatedActionClient
  .schema(ZBatchGenerateAudioAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    const results: { elementId: string; fileUrl: string; hash: string; skipped?: boolean; error?: string }[] =
      [];
    const CONCURRENCY = 3;

    for (let i = 0; i < parsedInput.elements.length; i += CONCURRENCY) {
      const batch = parsedInput.elements.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (el) => {
          const newHash = crypto
            .createHash("sha256")
            .update(`${el.scriptText}|${parsedInput.voiceName}|${parsedInput.languageCode}`)
            .digest("hex");

          if (el.currentHash === newHash) {
            return { elementId: el.elementId, fileUrl: "", hash: newHash, skipped: true };
          }

          const wavBuffer = await synthesizeSpeech({
            text: el.scriptText,
            languageCode: parsedInput.languageCode,
            voiceName: parsedInput.voiceName,
          });

          await initStorageFromDB();
          const s3Client = createS3Client();
          const bucket = getActiveBucketName();
          if (!s3Client || !bucket) throw new Error("Storage not configured");

          const fileName = `tts-${el.elementId}-${parsedInput.languageCode}-${Date.now()}.wav`;
          const key = `${parsedInput.environmentId}/public/${fileName}`;
          await s3Client.send(
            new PutObjectCommand({ Bucket: bucket, Key: key, Body: wavBuffer, ContentType: "audio/wav" })
          );

          return {
            elementId: el.elementId,
            fileUrl: `/storage/${parsedInput.environmentId}/public/${encodeURIComponent(fileName)}`,
            hash: newHash,
          };
        })
      );

      for (const [idx, r] of batchResults.entries()) {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          results.push({
            elementId: batch[idx].elementId,
            fileUrl: "",
            hash: "",
            error: String(r.reason),
          });
        }
      }
    }

    return { results };
  });
