"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationNovu } from "@hivecfm/types/integration/novu";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { testNovuConnectionAction } from "@/app/(app)/environments/[environmentId]/workspace/integrations/novu/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface NovuWrapperProps {
  environmentId: string;
  novuIntegration: TIntegrationNovu | null;
}

const DEFAULT_NOVU_API_URL = "https://novu.xcai.io/api";

export const NovuWrapper = ({ environmentId, novuIntegration }: NovuWrapperProps) => {
  const [isConnected, setIsConnected] = useState(!!novuIntegration?.config?.key);
  const [integrationId, setIntegrationId] = useState(novuIntegration?.id ?? "");
  const [apiKey, setApiKey] = useState(novuIntegration?.config?.key?.apiKey ?? "");
  const [apiUrl, setApiUrl] = useState(novuIntegration?.config?.key?.apiUrl ?? DEFAULT_NOVU_API_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }
    setIsTesting(true);
    try {
      const result = await testNovuConnectionAction({ environmentId, apiKey, apiUrl });
      if (result?.data?.success) {
        toast.success("Connection successful");
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage ?? "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createOrUpdateIntegrationAction({
        environmentId,
        integrationData: {
          type: "novu",
          config: {
            key: { apiKey, apiUrl },
            data: [],
          },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("Novu integration saved successfully");
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
        setApiKey("");
        setApiUrl(DEFAULT_NOVU_API_URL);
        setIntegrationId("");
        toast.success("Novu integration disconnected");
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

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "********";
    return key.slice(0, 4) + "****" + key.slice(-4);
  };

  if (isConnected) {
    return (
      <div className="rounded-lg border border-slate-200 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900">Novu Connected</h3>
            <p className="text-sm text-slate-500">
              Contacts will be synced as Novu subscribers for notifications.
            </p>
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
            <p className="mt-1 font-mono text-sm text-slate-600">{maskApiKey(apiKey)}</p>
          </div>
          <div>
            <Label>API URL</Label>
            <p className="mt-1 text-sm text-slate-600">{apiUrl}</p>
          </div>
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
      <div className="mb-6">
        <h3 className="text-lg font-medium text-slate-900">Connect Novu</h3>
        <p className="text-sm text-slate-500">
          Enter your Novu API credentials to sync contacts as subscribers.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="novu-api-key">API Key</Label>
          <Input
            id="novu-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Novu API key"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="novu-api-url">API URL</Label>
          <Input
            id="novu-api-url"
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={DEFAULT_NOVU_API_URL}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleTestConnection} loading={isTesting}>
          Test Connection
        </Button>
        <Button onClick={handleSave} loading={isSaving} disabled={!apiKey.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
};
