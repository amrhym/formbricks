import { type NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { ZEnvironmentId } from "@hivecfm/types/environment";
import { TSurveyElement } from "@hivecfm/types/surveys/elements";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { getSurvey } from "@/lib/survey/service";
import { getSignedUrlForDownload } from "@/modules/storage/service";

interface Params {
  environmentId: string;
  surveyId: string;
  questionId: string;
}

/**
 * Extracts storage file info (environmentId, accessType, fileName) from a storage URL.
 * Expected URL format: .../storage/{environmentId}/{accessType}/{fileName}
 */
const parseStorageUrl = (
  url: string
): { environmentId: string; accessType: "public" | "private"; fileName: string } | null => {
  try {
    // Handle both full URLs and relative paths like /storage/envId/public/file.wav
    let pathToParse: string;
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      pathToParse = urlObj.pathname;
    } else {
      pathToParse = url;
    }

    const parts = pathToParse.split("/storage/");
    if (parts.length < 2) return null;

    const segments = parts[1].split("/");
    if (segments.length < 3) return null;

    const [envId, accessType, ...fileNameParts] = segments;
    const fileName = fileNameParts.join("/");

    if (accessType !== "public" && accessType !== "private") return null;
    if (!envId || !fileName) return null;

    return { environmentId: envId, accessType, fileName };
  } catch {
    return null;
  }
};

export const GET = async (request: NextRequest, props: { params: Promise<Params> }): Promise<Response> => {
  const params = await props.params;
  const { environmentId, surveyId, questionId } = params;

  // Extract lang parameter
  const lang = request.nextUrl.searchParams.get("lang") || undefined;

  const environmentIdValidation = ZEnvironmentId.safeParse(environmentId);
  if (!environmentIdValidation.success) {
    return responses.badRequestResponse(
      "Fields are missing or incorrectly formatted",
      transformErrorToDetails(environmentIdValidation.error),
      true
    );
  }

  const survey = await getSurvey(surveyId);
  if (!survey) {
    return responses.notFoundResponse("Survey", surveyId, true);
  }

  if (survey.environmentId !== environmentId) {
    return responses.badRequestResponse(
      "Survey is part of another environment",
      { "survey.environmentId": survey.environmentId, environmentId },
      true
    );
  }

  // Helper to resolve audio URL from an i18n record or legacy string
  const resolveAudioUrl = (audioUrlField: unknown): string | null => {
    if (typeof audioUrlField === "string") {
      return audioUrlField; // legacy
    } else if (audioUrlField && typeof audioUrlField === "object") {
      const map = audioUrlField as Record<string, string>;
      return (lang && map[lang]) || map["default"] || null;
    }
    return null;
  };

  // Handle special IDs: welcome and ending
  let resolvedAudioUrl: string | null = null;

  if (questionId === "welcome") {
    resolvedAudioUrl = resolveAudioUrl((survey.welcomeCard as any)?.audioUrl);
    if (!resolvedAudioUrl) {
      return responses.notFoundResponse("Audio", questionId, true);
    }
  } else if (questionId === "ending") {
    const ending = survey.endings.length > 0 ? survey.endings[0] : null;
    resolvedAudioUrl = resolveAudioUrl((ending as any)?.audioUrl);
    if (!resolvedAudioUrl) {
      return responses.notFoundResponse("Audio", questionId, true);
    }
  } else {
    // Find the element across all blocks
    let targetElement: TSurveyElement | null = null;
    for (const block of survey.blocks) {
      for (const element of block.elements) {
        if (element.id === questionId) {
          targetElement = element;
          break;
        }
      }
      if (targetElement) break;
    }

    if (!targetElement) {
      return responses.notFoundResponse("Question", questionId, true);
    }

    resolvedAudioUrl = resolveAudioUrl(targetElement.audioUrl);
    if (!resolvedAudioUrl) {
      return responses.notFoundResponse("Audio", questionId, true);
    }
  }

  // Parse the storage URL to get file info for S3 download
  const storageInfo = parseStorageUrl(resolvedAudioUrl);
  if (!storageInfo) {
    // If audioUrl is an external URL (not in our storage), redirect to it
    return Response.redirect(resolvedAudioUrl, 302);
  }

  const signedUrlResult = await getSignedUrlForDownload(
    storageInfo.fileName,
    storageInfo.environmentId,
    storageInfo.accessType
  );

  if (!signedUrlResult.ok) {
    logger.error(
      { error: signedUrlResult.error, questionId, audioUrl: resolvedAudioUrl },
      "Failed to get signed URL for IVR audio"
    );
    return responses.notFoundResponse("Audio file", questionId, true);
  }

  // Proxy the audio file from S3 with proper audio headers
  try {
    const s3Response = await fetch(signedUrlResult.data);
    if (!s3Response.ok) {
      logger.error({ status: s3Response.status, questionId }, "Failed to fetch audio file from storage");
      return responses.internalServerErrorResponse("Failed to fetch audio file from storage");
    }

    const headers = new Headers();

    // Set content type from S3 response, or infer from file extension
    const contentType = s3Response.headers.get("Content-Type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    } else {
      // Fallback: infer from extension
      const ext = storageInfo.fileName.split(".").pop()?.toLowerCase();
      const audioMimeTypes: Record<string, string> = {
        wav: "audio/wav",
        mp3: "audio/mpeg",
        m4a: "audio/mp4",
        ogg: "audio/ogg",
      };
      headers.set("Content-Type", audioMimeTypes[ext || ""] || "application/octet-stream");
    }

    const contentLength = s3Response.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);

    // Cache for 1 hour — audio prompts rarely change
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600");

    // Allow IVR systems to fetch this cross-origin
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return new Response(s3Response.body, { status: 200, headers });
  } catch (fetchError) {
    logger.error({ error: fetchError, questionId }, "Error proxying audio file from storage");
    return responses.internalServerErrorResponse("Failed to fetch audio file from storage");
  }
};

export const OPTIONS = async (): Promise<Response> => {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(null, { status: 204, headers });
};
