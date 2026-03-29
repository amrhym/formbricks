"use server";

import { z } from "zod";
import { syncAudioPromptsToGenesys } from "@/lib/genesys-cloud/prompt-sync";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";
import { getOrganizationIdFromSurveyId, getProjectIdFromSurveyId } from "@/lib/utils/helper";
import { getSurvey } from "@/modules/survey/lib/survey";

const ZSyncToGenesysInput = z.object({
  surveyId: z.string(),
  environmentId: z.string(),
});

export const syncToGenesysAction = authenticatedActionClient
  .schema(ZSyncToGenesysInput)
  .action(
    async ({
      ctx,
      parsedInput,
    }: {
      ctx: AuthenticatedActionClientCtx;
      parsedInput: { surveyId: string; environmentId: string };
    }) => {
      const organizationId = await getOrganizationIdFromSurveyId(parsedInput.surveyId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
          {
            type: "projectTeam",
            projectId: await getProjectIdFromSurveyId(parsedInput.surveyId),
            minPermission: "readWrite",
          },
        ],
      });

      const survey = await getSurvey(parsedInput.surveyId);
      if (!survey) {
        throw new Error("Survey not found");
      }

      const elements = (survey.blocks ?? [])
        .flatMap((b: any) => b.elements ?? [])
        .map((el: any) => ({
          id: el.id,
          audioUrl: el.audioUrl as Record<string, string> | undefined,
          audioSource: el.audioSource as string | undefined,
        }));

      // Get welcome and ending audio
      const welcomeAudioUrl = (survey.welcomeCard as any)?.audioUrl as Record<string, string> | undefined;
      const welcomeAudioSource = (survey.welcomeCard as any)?.audioSource as string | undefined;

      // Get ending audio (first endScreen ending)
      const endScreenEnding =
        survey.endings?.length > 0 && (survey.endings[0] as any)?.type === "endScreen"
          ? (survey.endings[0] as any)
          : undefined;
      const endingAudioUrl = endScreenEnding?.audioUrl as Record<string, string> | undefined;
      const endingAudioSource = endScreenEnding?.audioSource as string | undefined;

      const result = await syncAudioPromptsToGenesys(parsedInput.environmentId, {
        id: survey.id,
        name: survey.name,
        elements,
        welcomeAudioUrl,
        welcomeAudioSource,
        endingAudioUrl,
        endingAudioSource,
        languages: survey.languages as any,
      });

      return result;
    }
  );
