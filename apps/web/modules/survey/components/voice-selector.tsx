"use client";

import { useEffect, useState } from "react";
import { listTtsVoicesAction } from "@/modules/survey/editor/actions/generate-audio";

interface VoiceSelectorProps {
  languageCode: string;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export const VoiceSelector = ({ languageCode, selectedVoice, onVoiceChange }: VoiceSelectorProps) => {
  const [voices, setVoices] = useState<{ name: string; ssmlGender: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    listTtsVoicesAction({ languageCode })
      .then((r) => setVoices(r?.data?.voices || []))
      .finally(() => setIsLoading(false));
  }, [languageCode]);

  return (
    <select
      value={selectedVoice}
      onChange={(e) => onVoiceChange(e.target.value)}
      disabled={isLoading}
      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50">
      <option value="">{isLoading ? "Loading voices..." : "Select voice..."}</option>
      {voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name} ({v.ssmlGender})
        </option>
      ))}
    </select>
  );
};
