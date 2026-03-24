"use client";

import { NetworkIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationHivecfmHub } from "@hivecfm/types/integration/hivecfm-hub";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface HubIntegrationWrapperProps {
  environmentId: string;
  hubIntegration: TIntegrationHivecfmHub | null;
}

export const HubIntegrationWrapper = ({ environmentId, hubIntegration }: HubIntegrationWrapperProps) => {
  const existingCreds = hubIntegration?.config?.key;

  const [isConnected, setIsConnected] = useState(!!existingCreds);
  const [integrationId, setIntegrationId] = useState(hubIntegration?.id ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [hubUrl, setHubUrl] = useState(existingCreds?.hubUrl ?? "");
  const [apiKey, setApiKey] = useState(existingCreds?.apiKey ?? "");

  const buildCredentials = () => ({
    hubUrl,
    apiKey,
  });

  const isFormValid = () => {
    return hubUrl.trim() && apiKey.trim();
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
        body: JSON.stringify({ type: "hub", config: { hubUrl, apiKey } }),
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
          type: "hivecfmHub",
          config: { key: buildCredentials(), data: [] },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("HiveCFM Hub integration saved successfully");
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
        setHubUrl("");
        setApiKey("");
        setIntegrationId("");
        toast.success("HiveCFM Hub integration disconnected");
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
            <NetworkIcon className="h-6 w-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">HiveCFM Hub Connected</h3>
              <p className="text-sm text-slate-500">{hubUrl}</p>
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
            <Label>Hub URL</Label>
            <p className="mt-1 text-sm text-slate-600">{hubUrl}</p>
          </div>
          <div>
            <Label>API Key</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(apiKey)}</p>
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
      <div className="mb-6 flex items-center gap-3">
        <NetworkIcon className="h-6 w-6 text-slate-900" />
        <div>
          <h3 className="text-lg font-medium text-slate-900">Connect HiveCFM Hub</h3>
          <p className="text-sm text-slate-500">
            Configure the connection to HiveCFM Hub for centralized management.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="hub-url">Hub URL</Label>
          <Input
            id="hub-url"
            type="text"
            value={hubUrl}
            onChange={(e) => setHubUrl(e.target.value)}
            placeholder="http://hivecfm-hub-api:8080"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="hub-api-key">API Key</Label>
          <Input
            id="hub-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
            className="mt-1"
          />
        </div>
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
