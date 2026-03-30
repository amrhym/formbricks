"use client";

import { BrainCircuitIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { TIntegration, TIntegrationInput } from "@hivecfm/types/integration";
import { createOrUpdateIntegrationAction } from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";
import { testGoogleAiConnectionAction } from "../actions";

interface GoogleAiWrapperProps {
  environmentId: string;
  integration: TIntegration | null;
}

export const GoogleAiWrapper = ({ environmentId, integration }: GoogleAiWrapperProps) => {
  const existingKey = (integration?.config as any)?.key;
  const [apiKey, setApiKey] = useState(existingKey?.apiKey || "");
  const [isConnected, setIsConnected] = useState(!!existingKey?.apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testGoogleAiConnectionAction({
        environmentId,
        credentials: { apiKey },
      });
      if (result?.data?.success) {
        setTestResult({ success: true, message: `Connected! ${result.data.voiceCount} voices available.` });
      } else {
        setTestResult({ success: false, message: "Connection failed." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Connection failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const input: TIntegrationInput = {
        type: "googleAi",
        config: {
          key: { apiKey },
          data: [],
        },
      };
      await createOrUpdateIntegrationAction({ environmentId, integrationData: input });
      setIsConnected(true);
      setTestResult({ success: true, message: "Saved successfully!" });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Save failed." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setApiKey("");
    setIsConnected(false);
    setTestResult(null);
    // Save empty config to disconnect
    try {
      const input: TIntegrationInput = {
        type: "googleAi",
        config: {
          key: { apiKey: "" },
          data: [],
        },
      };
      await createOrUpdateIntegrationAction({ environmentId, integrationData: input });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
          <BrainCircuitIcon className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-slate-900">Google AI (Text-to-Speech)</h2>
          <p className="text-sm text-slate-500">
            Generate audio for IVR voice surveys using Google Cloud Text-to-Speech API.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 p-6">
        <div>
          <Label htmlFor="google-ai-api-key">API Key</Label>
          <Input
            id="google-ai-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="mt-1"
          />
          <p className="mt-1 text-xs text-slate-400">Google Cloud API key with Text-to-Speech API enabled.</p>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
            {testResult.success ? (
              <CheckCircle2Icon className="h-4 w-4" />
            ) : (
              <XCircleIcon className="h-4 w-4" />
            )}
            {testResult.message}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            loading={isTesting}
            disabled={!apiKey}>
            Test Connection
          </Button>
          <Button size="sm" onClick={handleSave} loading={isSaving} disabled={!apiKey}>
            Save
          </Button>
          {isConnected && (
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
