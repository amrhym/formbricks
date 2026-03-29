import { TSurvey } from "@hivecfm/types/surveys/types";

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".m4a"];

function isAudioUrl(url: string | undefined): boolean {
  if (!url) return false;
  return AUDIO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

/**
 * Migrate legacy audio fields on welcome/ending cards to the new audioUrl field.
 * Called before saving a voice survey in the editor.
 * Returns a modified survey object (does not mutate input).
 */
export function migrateVoiceSurveyAudio(survey: TSurvey): TSurvey {
  if (survey.type !== "voice") return survey;

  const result = { ...survey };

  // Welcome card: copy fileUrl audio to audioUrl if audioUrl not set
  if (result.welcomeCard?.fileUrl && isAudioUrl(result.welcomeCard.fileUrl) && !result.welcomeCard.audioUrl) {
    result.welcomeCard = {
      ...result.welcomeCard,
      audioUrl: { default: result.welcomeCard.fileUrl },
      audioSource: "upload" as const,
      fileUrl: undefined,
    };
  }

  // Ending cards: move imageUrl audio to audioUrl if audioUrl not set
  if (result.endings) {
    result.endings = result.endings.map((ending) => {
      if (ending.type === "endScreen" && ending.imageUrl && isAudioUrl(ending.imageUrl) && !ending.audioUrl) {
        return {
          ...ending,
          audioUrl: { default: ending.imageUrl },
          audioSource: "upload" as const,
          imageUrl: undefined,
        };
      }
      return ending;
    });
  }

  return result;
}
