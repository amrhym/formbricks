"use client";

import { Loader2, SparklesIcon, WandIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { generateSurveyAction } from "@/modules/ai/actions";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface AiSurveyBuilderProps {
  onSurveyGenerated?: (survey: any) => void;
}

export const AiSurveyBuilder = ({ onSurveyGenerated }: AiSurveyBuilderProps) => {
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast.success(
        `Survey "${result.survey.name}" generated with ${result.survey.blocks.reduce((sum: number, b: any) => sum + b.elements.length, 0)} questions`
      );
      if (onSurveyGenerated) {
        onSurveyGenerated(result.survey);
      }
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
            placeholder="e.g. Banking, Healthcare, Retail"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={generateSurvey} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Survey...
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
          <h4 className="mb-2 text-sm font-semibold text-slate-800">{generatedSurvey.name}</h4>
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
