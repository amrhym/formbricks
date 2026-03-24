"use client";

import { BarChart3Icon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationSuperset } from "@hivecfm/types/integration/superset";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface SupersetIntegrationWrapperProps {
  environmentId: string;
  supersetIntegration: TIntegrationSuperset | null;
}

export const SupersetIntegrationWrapper = ({
  environmentId,
  supersetIntegration,
}: SupersetIntegrationWrapperProps) => {
  const existingCreds = supersetIntegration?.config?.key;

  const [isConnected, setIsConnected] = useState(!!existingCreds);
  const [integrationId, setIntegrationId] = useState(supersetIntegration?.id ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [publicUrl, setPublicUrl] = useState(existingCreds?.publicUrl ?? "");
  const [adminUsername, setAdminUsername] = useState(existingCreds?.adminUsername ?? "");
  const [adminPassword, setAdminPassword] = useState(existingCreds?.adminPassword ?? "");
  const [guestTokenJwtSecret, setGuestTokenJwtSecret] = useState(existingCreds?.guestTokenJwtSecret ?? "");
  const [databaseConnectionString, setDatabaseConnectionString] = useState(
    existingCreds?.databaseConnectionString ?? ""
  );

  const buildCredentials = () => ({
    publicUrl,
    adminUsername,
    adminPassword,
    guestTokenJwtSecret,
    databaseConnectionString,
  });

  const isFormValid = () => {
    return (
      publicUrl.trim() &&
      adminUsername.trim() &&
      adminPassword.trim() &&
      guestTokenJwtSecret.trim() &&
      databaseConnectionString.trim()
    );
  };

  const handleTestConnection = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsTesting(true);
    try {
      const response = await fetch(publicUrl.replace(/\/$/, "") + "/api/v1/security/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          provider: "db",
        }),
      });
      if (response.ok) {
        toast.success("Connection successful");
      } else {
        toast.error("Connection failed: Unable to authenticate with Superset");
      }
    } catch {
      toast.error("Connection test failed: Unable to reach Superset");
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
          type: "superset",
          config: { key: buildCredentials(), data: [] },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("Superset integration saved successfully");
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
        setPublicUrl("");
        setAdminUsername("");
        setAdminPassword("");
        setGuestTokenJwtSecret("");
        setDatabaseConnectionString("");
        setIntegrationId("");
        toast.success("Superset integration disconnected");
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
            <BarChart3Icon className="h-6 w-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">Superset Connected</h3>
              <p className="text-sm text-slate-500">{publicUrl}</p>
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
            <Label>Public URL</Label>
            <p className="mt-1 text-sm text-slate-600">{publicUrl}</p>
          </div>
          <div>
            <Label>Admin Username</Label>
            <p className="mt-1 text-sm text-slate-600">{adminUsername}</p>
          </div>
          <div>
            <Label>Admin Password</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(adminPassword)}</p>
          </div>
          <div>
            <Label>Guest Token JWT Secret</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(guestTokenJwtSecret)}</p>
          </div>
          <div>
            <Label>Database Connection String</Label>
            <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(databaseConnectionString)}</p>
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
        <BarChart3Icon className="h-6 w-6 text-slate-900" />
        <div>
          <h3 className="text-lg font-medium text-slate-900">Connect Superset</h3>
          <p className="text-sm text-slate-500">
            Configure Apache Superset for embedded dashboards and analytics.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="superset-public-url">Public URL</Label>
          <Input
            id="superset-public-url"
            type="text"
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.target.value)}
            placeholder="https://superset.hivecfm.xcai.io"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="superset-admin-username">Admin Username</Label>
          <Input
            id="superset-admin-username"
            type="text"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            placeholder="admin"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="superset-admin-password">Admin Password</Label>
          <Input
            id="superset-admin-password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter admin password"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="superset-jwt-secret">Guest Token JWT Secret</Label>
          <Input
            id="superset-jwt-secret"
            type="password"
            value={guestTokenJwtSecret}
            onChange={(e) => setGuestTokenJwtSecret(e.target.value)}
            placeholder="Enter JWT secret"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="superset-db-connection">Database Connection String</Label>
          <Input
            id="superset-db-connection"
            type="text"
            value={databaseConnectionString}
            onChange={(e) => setDatabaseConnectionString(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
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
