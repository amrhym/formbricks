"use client";

import { CopyIcon, PhoneIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { testGenesysCloudConnectionAction } from "@/app/(app)/environments/[environmentId]/workspace/integrations/genesys-cloud/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface GenesysCloudWrapperProps {
  environmentId: string;
  genesysCloudIntegration: TIntegrationGenesysCloud | null;
  webappUrl: string;
}

export const GenesysCloudWrapper = ({
  environmentId,
  genesysCloudIntegration,
  webappUrl,
}: GenesysCloudWrapperProps) => {
  const existingCreds = genesysCloudIntegration?.config?.key;

  const [isConnected, setIsConnected] = useState(!!existingCreds);
  const [integrationId, setIntegrationId] = useState(genesysCloudIntegration?.id ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [clientId, setClientId] = useState(existingCreds?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(existingCreds?.clientSecret ?? "");
  const [environmentUrl, setEnvironmentUrl] = useState(existingCreds?.environmentUrl ?? "");

  const botTurnUrl = `${webappUrl}/api/v1/management/bot-connector/turn`;
  const botListUrl = `${webappUrl}/api/v1/management/bot-connector/bots`;

  const buildCredentials = () => ({
    clientId,
    clientSecret,
    environmentUrl,
  });

  const isFormValid = () => {
    return clientId.trim() && clientSecret.trim() && environmentUrl.trim();
  };

  const handleTestConnection = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsTesting(true);
    try {
      const result = await testGenesysCloudConnectionAction({
        environmentId,
        credentials: buildCredentials(),
      });
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
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createOrUpdateIntegrationAction({
        environmentId,
        integrationData: {
          type: "genesysCloud",
          config: { key: buildCredentials(), data: [] },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("Genesys Cloud integration saved successfully");
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
        setClientId("");
        setClientSecret("");
        setEnvironmentUrl("");
        setIntegrationId("");
        toast.success("Genesys Cloud integration disconnected");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const BotConnectorSection = () => (
    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-medium text-slate-900">Bot Connector Endpoints</h4>
      <p className="mb-4 text-xs text-slate-500">
        Use your API key as the <code className="rounded bg-slate-200 px-1">x-Api-Key</code> header when
        calling these endpoints.
      </p>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Bot Turn URL</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
              {botTurnUrl}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(botTurnUrl)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <Label className="text-xs">Bot List URL</Label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
              {botListUrl}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(botListUrl)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isConnected) {
    return (
      <div className="rounded-lg border border-slate-200 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PhoneIcon className="h-6 w-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">Genesys Cloud Connected</h3>
              <p className="text-sm text-slate-500">OAuth2 Client Credentials</p>
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
            <Label>Client ID</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(clientId)}</p>
          </div>
          <div>
            <Label>Client Secret</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(clientSecret)}</p>
          </div>
          <div>
            <Label>Environment URL</Label>
            <p className="mt-1 text-sm text-slate-600">{environmentUrl}</p>
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

        <BotConnectorSection />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <div className="mb-6 flex items-center gap-3">
        <PhoneIcon className="h-6 w-6 text-slate-900" />
        <div>
          <h3 className="text-lg font-medium text-slate-900">Connect Genesys Cloud</h3>
          <p className="text-sm text-slate-500">
            Enter your OAuth2 client credentials to connect with Genesys Cloud.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="gc-client-id">Client ID</Label>
          <Input
            id="gc-client-id"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter Client ID"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="gc-client-secret">Client Secret</Label>
          <Input
            id="gc-client-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Enter Client Secret"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="gc-environment-url">Environment URL</Label>
          <Input
            id="gc-environment-url"
            type="url"
            value={environmentUrl}
            onChange={(e) => setEnvironmentUrl(e.target.value)}
            placeholder="https://login.mypurecloud.com"
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

      <BotConnectorSection />
    </div>
  );
};
