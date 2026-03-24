"use client";

import { BrainCircuitIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationLlm, TLlmProvider } from "@hivecfm/types/integration/llm";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface LlmIntegrationWrapperProps {
  environmentId: string;
  llmIntegration: TIntegrationLlm | null;
}

const PROVIDER_LABELS: Record<TLlmProvider, string> = {
  azureOpenAI: "Azure OpenAI",
  openAI: "OpenAI",
};

export const LlmIntegrationWrapper = ({ environmentId, llmIntegration }: LlmIntegrationWrapperProps) => {
  const existingCreds = llmIntegration?.config?.key;

  const [isConnected, setIsConnected] = useState(!!existingCreds);
  const [integrationId, setIntegrationId] = useState(llmIntegration?.id ?? "");
  const [provider, setProvider] = useState<TLlmProvider>(existingCreds?.provider ?? "azureOpenAI");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [apiKey, setApiKey] = useState(existingCreds?.apiKey ?? "");

  // Azure OpenAI fields
  const [endpointUrl, setEndpointUrl] = useState(
    existingCreds?.provider === "azureOpenAI" ? existingCreds.endpointUrl : ""
  );
  const [deploymentName, setDeploymentName] = useState(
    existingCreds?.provider === "azureOpenAI" ? existingCreds.deploymentName : ""
  );
  const [apiVersion, setApiVersion] = useState(
    existingCreds?.provider === "azureOpenAI" ? existingCreds.apiVersion : "2024-06-01"
  );

  // OpenAI fields
  const [model, setModel] = useState(existingCreds?.provider === "openAI" ? existingCreds.model : "");

  const buildCredentials = () => {
    if (provider === "azureOpenAI") {
      return {
        provider: "azureOpenAI" as const,
        apiKey,
        endpointUrl,
        deploymentName,
        apiVersion,
      };
    }
    return {
      provider: "openAI" as const,
      apiKey,
      model,
    };
  };

  const isFormValid = () => {
    if (!apiKey.trim()) return false;
    if (provider === "azureOpenAI") {
      return endpointUrl.trim() && deploymentName.trim() && apiVersion.trim();
    }
    return model.trim();
  };

  const handleTestConnection = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch("/api/integrations/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "llm", config: buildCredentials() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Connection successful");
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createOrUpdateIntegrationAction({
        environmentId,
        integrationData: {
          type: "llm",
          config: { key: buildCredentials(), data: [] },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("LLM integration saved successfully");
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage ?? "Failed to save integration");
      }
    } catch {
      toast.error("Failed to save integration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integrationId) return;
    setIsDeleting(true);
    try {
      const result = await deleteIntegrationAction({ integrationId });
      if (result?.data) {
        setIsConnected(false);
        setProvider("azureOpenAI");
        setApiKey("");
        setEndpointUrl("");
        setDeploymentName("");
        setApiVersion("2024-06-01");
        setModel("");
        setIntegrationId("");
        toast.success("LLM integration disconnected");
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage ?? "Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect integration");
    } finally {
      setIsDeleting(false);
    }
  };

  const maskValue = (value: string) => {
    if (value.length <= 8) return "********";
    return value.slice(0, 4) + "****" + value.slice(-4);
  };

  if (isConnected) {
    return (
      <div className="rounded-lg border border-slate-200 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrainCircuitIcon className="h-6 w-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">LLM Model Connected</h3>
              <p className="text-sm text-slate-500">Provider: {PROVIDER_LABELS[provider]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Connected
            </span>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <Label>API Key</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(apiKey)}</p>
          </div>
          {provider === "azureOpenAI" && (
            <>
              <div>
                <Label>Endpoint URL</Label>
                <p className="mt-1 text-sm text-slate-600">{endpointUrl}</p>
              </div>
              <div>
                <Label>Deployment Name</Label>
                <p className="mt-1 text-sm text-slate-600">{deploymentName}</p>
              </div>
              <div>
                <Label>API Version</Label>
                <p className="mt-1 text-sm text-slate-600">{apiVersion}</p>
              </div>
            </>
          )}
          {provider === "openAI" && (
            <div>
              <Label>Model</Label>
              <p className="mt-1 text-sm text-slate-600">{model}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleTestConnection} loading={isTesting}>
            Test Connection
          </Button>
          <Button variant="destructive" onClick={handleDisconnect} loading={isDeleting}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <div className="mb-6 flex items-center gap-3">
        <BrainCircuitIcon className="h-6 w-6 text-slate-900" />
        <div>
          <h3 className="text-lg font-medium text-slate-900">Connect LLM Model</h3>
          <p className="text-sm text-slate-500">Configure an LLM provider for AI-powered features.</p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="llm-provider">Provider</Label>
          <select
            id="llm-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as TLlmProvider)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="azureOpenAI">Azure OpenAI</option>
            <option value="openAI">OpenAI</option>
          </select>
        </div>

        <div>
          <Label htmlFor="llm-api-key">API Key</Label>
          <Input
            id="llm-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
            className="mt-1"
          />
        </div>

        {provider === "azureOpenAI" && (
          <>
            <div>
              <Label htmlFor="llm-endpoint-url">Endpoint URL</Label>
              <Input
                id="llm-endpoint-url"
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://myresource.openai.azure.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="llm-deployment-name">Deployment Name</Label>
              <Input
                id="llm-deployment-name"
                type="text"
                value={deploymentName}
                onChange={(e) => setDeploymentName(e.target.value)}
                placeholder="gpt-4o-mini"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="llm-api-version">API Version</Label>
              <Input
                id="llm-api-version"
                type="text"
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                placeholder="2024-06-01"
                className="mt-1"
              />
            </div>
          </>
        )}

        {provider === "openAI" && (
          <div>
            <Label htmlFor="llm-model">Model</Label>
            <Input
              id="llm-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="mt-1"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleTestConnection} loading={isTesting}>
          Test Connection
        </Button>
        <Button onClick={handleSave} loading={isSaving} disabled={!isFormValid()}>
          Save
        </Button>
      </div>
    </div>
  );
};
