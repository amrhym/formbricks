"use client";

import { createId } from "@paralleldrive/cuid2";
import { Loader2, RocketIcon, SparklesIcon, WandIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { generateSurveyAction } from "@/modules/ai/actions";
import { createSurveyAction } from "@/modules/survey/components/template-list/actions";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface AiSurveyBuilderProps {
  environmentId: string;
  userId: string;
}

const convertToSurveyInput = (generated: any) => {
  const blocks = (generated.blocks || []).map((block: any) => ({
    id: createId(),
    name: block.name || "Block",
    elements: (block.elements || []).map((el: any) => {
      const element: any = {
        id: el.id || createId(),
        type: el.type,
        headline: el.headline || { default: "Untitled" },
        required: el.required ?? true,
      };
      if (el.subheader) element.subheader = el.subheader;
      if (el.type === "rating") {
        element.range = el.range || 5;
        element.scale = el.scale || "star";
        element.lowerLabel = { default: "Not satisfied" };
        element.upperLabel = { default: "Very satisfied" };
      }
      if (el.type === "nps") {
        element.lowerLabel = { default: "Not likely" };
        element.upperLabel = { default: "Very likely" };
      }
      if (el.type === "multipleChoiceSingle" || el.type === "multipleChoiceMulti") {
        element.choices = (el.choices || []).map((c: any) => ({
          id: c.id || createId(),
          label: c.label || { default: "Option" },
        }));
        element.shuffleOption = "none";
      }
      if (el.type === "openText") {
        element.placeholder = el.placeholder || { default: "Type your answer here..." };
        element.longResponse = el.longResponse ?? true;
        element.inputType = "text";
      }
      if (el.type === "cta") {
        element.buttonLabel = { default: "Continue" };
        element.dismissButtonLabel = { default: "Skip" };
        element.buttonExternal = false;
        element.html = { default: "" };
      }
      if (el.type === "consent") {
        element.label = el.headline;
        element.html = { default: "" };
      }
      if (el.type === "date") {
        element.format = "M-d-y";
      }
      return element;
    }),
  }));

  return {
    name: generated.name || "AI Generated Survey",
    type: "link" as const,
    status: "draft" as const,
    blocks,
    welcomeCard: {
      enabled: true,
      headline: { default: generated.welcomeHeadline || "Welcome" },
      subheader: generated.welcomeSubheader ? { default: generated.welcomeSubheader } : undefined,
      timeToFinish: true,
      showResponseCount: false,
    },
    endings: [
      {
        id: createId(),
        type: "endScreen" as const,
        headline: { default: generated.endingHeadline || "Thank you!" },
        subheader: generated.endingSubheader ? { default: generated.endingSubheader } : undefined,
      },
    ],
    hiddenFields: { enabled: false, fieldIds: [] },
    displayOption: "displayOnce" as const,
    autoClose: null,
    runOnDate: null,
    closeOnDate: null,
    delay: 0,
    displayPercentage: null,
    autoComplete: null,
    isVerifyEmailEnabled: false,
    styling: null,
    languages: [],
  };
};

export const AiSurveyBuilder = ({ environmentId, userId }: AiSurveyBuilderProps) => {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatedSurvey, setGeneratedSurvey] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const generateSurvey = async () => {
    if (!description.trim() || description.length < 10) {
      toast.error("Please provide a description (at least 10 characters)");
      return;
    }
    setLoading(true);
    try {
      const result = await generateSurveyAction(description, industry || undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setGeneratedSurvey(result.survey);
      toast.success("Survey generated! Click 'Create & Edit' to start editing.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate survey");
    } finally {
      setLoading(false);
    }
  };

  const createAndEdit = async () => {
    if (!generatedSurvey) return;
    setCreating(true);
    try {
      const surveyBody = convertToSurveyInput(generatedSurvey);
      surveyBody.createdBy = userId;

      const createResult = await createSurveyAction({
        environmentId,
        surveyBody,
      });

      if (createResult?.data) {
        toast.success("Survey created!");
        router.push(`/environments/${environmentId}/surveys/${createResult.data.id}/edit`);
      } else {
        const errorMessage = getFormattedErrorMessage(createResult);
        toast.error(errorMessage || "Failed to create survey");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create survey");
    } finally {
      setCreating(false);
    }
  };

  if (!showBuilder) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowBuilder(true)}
        className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
        <WandIcon className="mr-1 h-4 w-4" />
        AI Survey Builder
      </Button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-purple-600" />
        <h3 className="text-base font-semibold text-slate-800">AI Survey Builder</h3>
        <button
          onClick={() => setShowBuilder(false)}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <Label htmlFor="ai-description" className="text-sm">
            Describe the survey you want to create
          </Label>
          <Input
            id="ai-description"
            placeholder="e.g. Post-call satisfaction survey for banking customers with NPS and service quality questions"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ai-industry" className="text-sm">
            Industry (optional)
          </Label>
          <Input
            id="ai-industry"
            placeholder="e.g. Banking, Healthcare, Retail, Telecom"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={generateSurvey}
          disabled={loading || creating}
          className="bg-purple-600 hover:bg-purple-700">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="mr-2 h-4 w-4" />
              Generate Survey
            </>
          )}
        </Button>
      </div>
      {generatedSurvey && (
        <div className="mt-4 rounded-md border border-purple-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">{generatedSurvey.name}</h4>
            <Button
              size="sm"
              onClick={createAndEdit}
              disabled={creating}
              className="bg-green-600 hover:bg-green-700">
              {creating ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RocketIcon className="mr-1 h-3 w-3" />
                  Create &amp; Edit
                </>
              )}
            </Button>
          </div>
          <div className="space-y-1">
            {generatedSurvey.blocks.map((block: any, bi: number) => (
              <div key={bi}>
                <p className="text-xs font-medium text-slate-500">{block.name}</p>
                {block.elements.map((el: any, ei: number) => (
                  <p key={ei} className="ml-3 text-xs text-slate-600">
                    {bi * 10 + ei + 1}. [{el.type}] {el.headline?.default || "Untitled"}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Total: {generatedSurvey.blocks.reduce((s: number, b: any) => s + b.elements.length, 0)} questions
          </p>
        </div>
      )}
    </div>
  );
};
