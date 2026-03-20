"use client";

import { CheckCircleIcon, CopyIcon, InfoIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface PromptMapping {
  elementId: string;
  promptId: string;
  promptName: string;
}

interface GenesysIvrInfoProps {
  surveyId: string;
  environmentId: string;
  elements: { id: string; headline: string }[];
}

export const GenesysIvrInfo = ({ surveyId, environmentId, elements }: GenesysIvrInfoProps) => {
  const [mappings, setMappings] = useState<PromptMapping[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const ivrSurveyUrl = `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}`;
  const ivrResponseUrl = `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}/responses`;
  const ivrMediaUrlPattern = `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}/media/{questionId}`;

  const loadMappings = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/integrations/genesys-cloud/mappings?environmentId=${environmentId}&surveyId=${surveyId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
      }
    } catch {
      // Silent fail — mappings are optional display info
    }
  }, [environmentId, surveyId]);

  useEffect(() => {
    if (isOpen && mappings.length === 0) {
      loadMappings();
    }
  }, [isOpen, mappings.length, loadMappings]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getElementName = (elementId: string) => {
    const el = elements.find((e) => e.id === elementId);
    return el?.headline || elementId;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          loadMappings();
        }}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <InfoIcon className="h-3.5 w-3.5" />
        IVR Integration Info
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-900">IVR Integration Endpoints</h4>
        <button onClick={() => setIsOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Hide
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Get Survey Structure (GET)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              {ivrSurveyUrl}
            </code>
            <button onClick={() => copy(ivrSurveyUrl)} className="p-1 text-slate-400 hover:text-slate-600">
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Submit Response (POST)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              {ivrResponseUrl}
            </code>
            <button onClick={() => copy(ivrResponseUrl)} className="p-1 text-slate-400 hover:text-slate-600">
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Get Question Audio (GET)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              {ivrMediaUrlPattern}
            </code>
            <button
              onClick={() => copy(ivrMediaUrlPattern)}
              className="p-1 text-slate-400 hover:text-slate-600">
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {mappings.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Synced Genesys Prompts</p>
            <div className="space-y-1.5">
              {mappings.map((m) => (
                <div key={m.elementId} className="flex items-center gap-2 text-xs">
                  <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span className="truncate text-slate-600">{getElementName(m.elementId)}</span>
                  <span className="shrink-0 text-slate-400">→</span>
                  <code className="truncate rounded bg-white px-1.5 py-0.5 font-mono text-slate-500">
                    {m.promptName}
                  </code>
                  <button
                    onClick={() => copy(m.promptName)}
                    className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600">
                    <CopyIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Use your API key in the <code className="rounded bg-slate-200 px-1">x-Api-Key</code> header for
          authentication.
        </p>
      </div>
    </div>
  );
};
