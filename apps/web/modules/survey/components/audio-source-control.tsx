"use client";

import { MicIcon, UploadIcon, WandSparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TAudioSource } from "@hivecfm/types/surveys/elements";
import { buildCardScript, buildIvrScript } from "@/lib/google-tts/script-builder";
import {
  checkTtsConfiguredAction,
  generateAudioAction,
} from "@/modules/survey/editor/actions/generate-audio";
import { Button } from "@/modules/ui/components/button";
import { Label } from "@/modules/ui/components/label";

interface AudioSourceControlProps {
  environmentId: string;
  audioSource: TAudioSource;
  audioUrl: Record<string, string> | undefined;
  currentLanguage: string; // i18n key: "default" or "en", "ar", etc.
  scriptLanguageCode?: string; // actual ISO code for TTS script: "en", "ar" (never "default")
  defaultLanguageCode?: string; // actual ISO code of the survey's default language (e.g. "en")
  element?: any;
  cardType?: "welcome" | "ending";
  cardHeadline?: Record<string, string>;
  cardSubheader?: Record<string, string>;
  surveyVoiceConfig?: { voices?: Record<string, string> };
  onAudioSourceChange: (source: TAudioSource) => void;
  onAudioUrlChange: (audioUrl: Record<string, string>) => void;
  onAudioHashChange?: (hash: Record<string, string>) => void;
  onFileUpload: (file: File) => void;
}

export const AudioSourceControl = ({
  environmentId,
  audioSource,
  audioUrl,
  currentLanguage,
  scriptLanguageCode,
  defaultLanguageCode,
  element,
  cardType,
  cardHeadline,
  cardSubheader,
  surveyVoiceConfig,
  onAudioSourceChange,
  onAudioUrlChange,
  onAudioHashChange,
  onFileUpload,
}: AudioSourceControlProps) => {
  const [isTtsConfigured, setIsTtsConfigured] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Each language has its own audio — no fallback to "default"
  const currentAudioUrl = audioUrl?.[currentLanguage];

  useEffect(() => {
    checkTtsConfiguredAction({}).then((r) => setIsTtsConfigured(r?.data?.configured || false));
  }, []);

  // Resolve actual ISO language code for TTS templates (never "default")
  // Priority: scriptLanguageCode > currentLanguage (if not "default") > defaultLanguageCode > "en"
  const ttsLang = (() => {
    if (scriptLanguageCode && scriptLanguageCode !== "default") return scriptLanguageCode;
    if (currentLanguage && currentLanguage !== "default") return currentLanguage;
    if (defaultLanguageCode && defaultLanguageCode !== "default") return defaultLanguageCode;
    return "en";
  })();

  useEffect(() => {
    if (element) {
      setScriptText(buildIvrScript(element, ttsLang));
    } else if (cardType) {
      setScriptText(buildCardScript(cardHeadline, cardSubheader, ttsLang));
    }
  }, [element, cardType, cardHeadline, cardSubheader, ttsLang]);

  // Map ISO language codes to Google TTS language codes and default voices
  const LANG_TO_TTS: Record<string, { code: string; voice: string }> = {
    ar: { code: "ar-XA", voice: "ar-XA-Standard-A" },
    en: { code: "en-US", voice: "en-US-Standard-C" },
    fr: { code: "fr-FR", voice: "fr-FR-Standard-A" },
    es: { code: "es-ES", voice: "es-ES-Standard-A" },
    de: { code: "de-DE", voice: "de-DE-Standard-A" },
    tr: { code: "tr-TR", voice: "tr-TR-Standard-A" },
    ur: { code: "ur-PK", voice: "ur-PK-Standard-A" },
    hi: { code: "hi-IN", voice: "hi-IN-Standard-A" },
  };

  const handleGenerate = async () => {
    // ttsLang is already resolved to a real ISO code (never "default")
    const ttsMapping = LANG_TO_TTS[ttsLang] || LANG_TO_TTS["en"]!;

    const voiceName =
      surveyVoiceConfig?.voices?.[currentLanguage] ||
      surveyVoiceConfig?.voices?.[ttsLang] ||
      ttsMapping.voice;
    const langCode = ttsMapping.code;

    setIsGenerating(true);
    try {
      const result = await generateAudioAction({
        environmentId,
        scriptText,
        languageCode: langCode,
        voiceName,
        fileName: `tts-${element?.id || cardType}-${currentLanguage}-${Date.now()}.wav`,
      });

      console.log("[AudioSourceControl] generateAudioAction result:", JSON.stringify(result));
      if (result?.data) {
        const newAudioUrl = { ...(audioUrl || {}), [currentLanguage]: result.data.fileUrl };
        onAudioUrlChange(newAudioUrl);
        onAudioSourceChange("generated");
        if (onAudioHashChange) {
          const existingHash = (element as any)?.audioGenerationHash || {};
          onAudioHashChange({ ...existingHash, [currentLanguage]: result.data.hash });
        }
      } else {
        console.error("[AudioSourceControl] Generate failed:", JSON.stringify(result));
        alert(
          `Generate failed: ${JSON.stringify(result?.serverError || result?.validationErrors || "Unknown error")}`
        );
      }
    } catch (err) {
      console.error("[AudioSourceControl] Generate exception:", err);
      alert(`Generate error: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB)");
      return;
    }
    onFileUpload(file);
  };

  const tabs: { value: TAudioSource; label: string; icon: any; show: boolean }[] = [
    { value: "tts", label: "TTS", icon: MicIcon, show: true },
    { value: "upload", label: "Upload", icon: UploadIcon, show: true },
    { value: "generated", label: "Generate AI", icon: WandSparklesIcon, show: isTtsConfigured },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-slate-500">Audio Source</Label>
      <div className="flex gap-1">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onAudioSourceChange(tab.value)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                audioSource === tab.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
      </div>

      {audioSource === "tts" && (
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs text-slate-500">IVR will speak this text via TTS engine:</p>
          <p className="mt-1 text-sm text-slate-700" dir="auto">
            {scriptText || "(no text)"}
          </p>
        </div>
      )}

      {audioSource === "upload" && (
        <div>
          <input
            type="file"
            accept=".wav,.mp3"
            onChange={handleFileSelect}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          <p className="mt-1 text-xs text-slate-400">WAV preferred (8kHz/16kHz mono), max 5MB</p>
        </div>
      )}

      {audioSource === "generated" && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Script (editable)</Label>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={3}
              dir="auto"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <Button size="sm" type="button" onClick={handleGenerate} loading={isGenerating}>
            Generate Audio
          </Button>
        </div>
      )}

      {currentAudioUrl && audioSource !== "tts" && (
        <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2">
          <audio ref={audioRef} src={currentAudioUrl} controls className="h-8 w-full" />
        </div>
      )}
    </div>
  );
};
