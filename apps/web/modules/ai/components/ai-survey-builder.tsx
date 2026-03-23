"use client";

import { createId } from "@paralleldrive/cuid2";
import { Loader2, SparklesIcon, WandIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TTemplate } from "@hivecfm/types/templates";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

// Use API routes instead of server actions to avoid RSC serialization issues

interface AiSurveyBuilderProps {
  onTemplateGenerated: (template: TTemplate) => void;
}

const convertToTemplate = (generated: any): TTemplate => {
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
    description: `AI-generated survey with ${blocks.reduce((s: number, b: any) => s + b.elements.length, 0)} questions`,
    icon: undefined,
    preset: {
      name: generated.name || "AI Generated Survey",
      blocks,
      welcomeCard: {
        enabled: true,
        headline: { default: generated.welcomeHeadline || "Welcome" },
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
    },
  };
};

export const AiSurveyBuilder = ({ onTemplateGenerated }: AiSurveyBuilderProps) => {
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const generateSurvey = async () => {
    if (!description.trim() || description.length < 10) {
      toast.error("Please provide a description (at least 10 characters)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, industry: industry || undefined, maxQuestions: 10 }),
      });
      const result = await res.json();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const template = convertToTemplate(result.survey);
      onTemplateGenerated(template);
      setShowBuilder(false);
      setDescription("");
      setIndustry("");
      toast.success(`"${template.name}" generated! Preview it and click "Use this template" to create.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate survey");
    } finally {
      setLoading(false);
    }
  };

  if (!showBuilder) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowBuilder(true)}
        className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
        <WandIcon className="mr-1.5 h-4 w-4" />
        AI Survey Builder
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">AI Survey Builder</h3>
          </div>
          <button
            onClick={() => setShowBuilder(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <Label htmlFor="ai-description" className="text-sm font-medium">
              What kind of survey do you need?
            </Label>
            <Input
              id="ai-description"
              placeholder="e.g. Post-call satisfaction survey for banking customers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generateSurvey()}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="ai-industry" className="text-sm font-medium">
              Industry (optional)
            </Label>
            <Input
              id="ai-industry"
              placeholder="e.g. Banking, Healthcare, Retail, Telecom"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowBuilder(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={generateSurvey}
              disabled={loading || description.length < 10}
              className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
