"use client";

import { CheckCircleIcon, CopyIcon, DownloadIcon, InfoIcon } from "lucide-react";
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
  const ivrPromptsUrl = `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}/prompts`;

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
          <p className="mb-1 text-xs font-medium text-slate-500">Get Genesys Prompt Names (GET)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
              {ivrPromptsUrl}
            </code>
            <button onClick={() => copy(ivrPromptsUrl)} className="p-1 text-slate-400 hover:text-slate-600">
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

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">cURL Examples</p>
          <div className="space-y-2">
            <div>
              <p className="mb-1 text-xs text-slate-400">Get Survey Structure</p>
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
                  {`curl -X GET "${ivrSurveyUrl}" \\
  -H "x-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                </pre>
                <button
                  onClick={() =>
                    copy(
                      `curl -X GET "${ivrSurveyUrl}" \\\n  -H "x-Api-Key: YOUR_API_KEY" \\\n  -H "Content-Type: application/json"`
                    )
                  }
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">Get Genesys Prompt Names</p>
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
                  {`curl -X GET "${ivrPromptsUrl}" \\
  -H "x-Api-Key: YOUR_API_KEY"`}
                </pre>
                <button
                  onClick={() => copy(`curl -X GET "${ivrPromptsUrl}" \\\n  -H "x-Api-Key: YOUR_API_KEY"`)}
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">
                Submit Answer (per question — use same callId to accumulate)
              </p>
              <div className="flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
                  {`# First question (creates response)
curl -X POST "${ivrResponseUrl}" \\
  -H "x-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "callId": "unique-call-id",
    "callerNumber": "+1234567890",
    "finished": false,
    "answers": { "questionId1": "5" }
  }'

# Next question (updates same response)
curl -X POST "${ivrResponseUrl}" \\
  -H "x-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "callId": "unique-call-id",
    "finished": false,
    "answers": { "questionId2": "3" }
  }'

# Last question (marks as finished)
curl -X POST "${ivrResponseUrl}" \\
  -H "x-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "callId": "unique-call-id",
    "finished": true,
    "answers": { "questionId3": "4" }
  }'`}
                </pre>
                <button
                  onClick={() =>
                    copy(
                      `curl -X POST "${ivrResponseUrl}" \\\n  -H "x-Api-Key: YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "callId": "unique-call-id",\n    "callerNumber": "+1234567890",\n    "finished": false,\n    "answers": { "questionId1": "5" }\n  }'`
                    )
                  }
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Genesys Data Actions (import in Genesys)</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadDataAction("HiveCFM_GetSurveyQuestions", generateGetSurveyAction())}
              className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
              <DownloadIcon className="h-3 w-3" />
              GetSurveyQuestions.json
            </button>
            <button
              onClick={() => downloadDataAction("HiveCFM_GetPromptNames", generateGetPromptsAction())}
              className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
              <DownloadIcon className="h-3 w-3" />
              GetPromptNames.json
            </button>
            <button
              onClick={() => downloadDataAction("HiveCFM_SubmitAnswer", generateSubmitAnswerAction())}
              className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
              <DownloadIcon className="h-3 w-3" />
              SubmitAnswer.json
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Replace <code className="rounded bg-slate-200 px-1">YOUR_API_KEY</code> with your actual API key
          from Settings &gt; API Keys.
        </p>
      </div>
    </div>
  );

  function downloadDataAction(name: string, json: object) {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}.json`);
  }

  function generateGetSurveyAction() {
    return {
      name: "HiveCFM_GetSurveyQuestions",
      integrationType: "custom-rest-actions",
      actionType: "custom",
      config: {
        request: {
          requestUrlTemplate: `${baseUrl}/api/v1/client/${environmentId}/ivr/\${input.surveyId}`,
          requestType: "GET",
          headers: { "x-Api-Key": "YOUR_API_KEY" },
          requestTemplate: "${input.rawRequest}",
        },
        response: {
          translationMap: {
            totalQuestions: "$.data.survey.totalQuestions",
            surveyName: "$.data.survey.name",
            questions: "$.data.questions",
          },
          translationMapDefaults: { totalQuestions: "0", surveyName: '""', questions: "[]" },
          successTemplate:
            '{ "totalQuestions": ${totalQuestions}, "surveyName": ${surveyName}, "questions": ${questions} }',
        },
      },
      contract: {
        input: {
          inputSchema: {
            title: "Input",
            type: "object",
            properties: { surveyId: { type: "string" } },
            additionalProperties: true,
          },
        },
        output: {
          successSchema: {
            title: "Output",
            type: "object",
            properties: {
              totalQuestions: { type: "integer" },
              surveyName: { type: "string" },
              questions: { type: "array", items: { type: "object" } },
            },
            additionalProperties: true,
          },
        },
      },
      secure: false,
    };
  }

  function generateGetPromptsAction() {
    return {
      name: "HiveCFM_GetPromptNames",
      integrationType: "custom-rest-actions",
      actionType: "custom",
      config: {
        request: {
          requestUrlTemplate: `${baseUrl}/api/v1/client/${environmentId}/ivr/\${input.surveyId}/prompts`,
          requestType: "GET",
          headers: { "x-Api-Key": "YOUR_API_KEY" },
          requestTemplate: "${input.rawRequest}",
        },
        response: {
          translationMap: {
            surveyId: "$.data.surveyId",
            surveyName: "$.data.surveyName",
            prompts: "$.data.prompts",
          },
          translationMapDefaults: { surveyId: '""', surveyName: '""', prompts: "{}" },
          successTemplate: '{ "surveyId": ${surveyId}, "surveyName": ${surveyName}, "prompts": ${prompts} }',
        },
      },
      contract: {
        input: {
          inputSchema: {
            title: "Input",
            type: "object",
            properties: { surveyId: { type: "string" } },
            additionalProperties: true,
          },
        },
        output: {
          successSchema: {
            title: "Output",
            type: "object",
            properties: {
              surveyId: { type: "string" },
              surveyName: { type: "string" },
              prompts: { type: "object" },
            },
            additionalProperties: true,
          },
        },
      },
      secure: false,
    };
  }

  function generateSubmitAnswerAction() {
    return {
      name: "HiveCFM_SubmitAnswer",
      integrationType: "custom-rest-actions",
      actionType: "custom",
      config: {
        request: {
          requestUrlTemplate: `${baseUrl}/api/v1/client/${environmentId}/ivr/\${input.surveyId}/responses`,
          requestType: "POST",
          headers: { "x-Api-Key": "YOUR_API_KEY" },
          requestTemplate:
            '{ "callId": "${input.callId}", "callerNumber": "${input.callerNumber}", "finished": ${input.finished}, "answers": { "${input.questionId}": "${input.answerValue}" } }',
        },
        response: {
          translationMap: {
            responseId: "$.data.responseId",
            status: "$.data.status",
            answersCount: "$.data.answersCount",
          },
          translationMapDefaults: { responseId: '""', status: '""', answersCount: "0" },
          successTemplate:
            '{ "responseId": ${responseId}, "status": ${status}, "answersCount": ${answersCount} }',
        },
      },
      contract: {
        input: {
          inputSchema: {
            title: "Input",
            type: "object",
            required: ["surveyId", "callId", "questionId", "answerValue", "finished"],
            properties: {
              surveyId: { type: "string" },
              callId: { type: "string" },
              callerNumber: { type: "string" },
              questionId: { type: "string" },
              answerValue: { type: "string" },
              finished: { type: "boolean" },
            },
            additionalProperties: true,
          },
        },
        output: {
          successSchema: {
            title: "Output",
            type: "object",
            properties: {
              responseId: { type: "string" },
              status: { type: "string" },
              answersCount: { type: "integer" },
            },
            additionalProperties: true,
          },
        },
      },
      secure: false,
    };
  }
};
