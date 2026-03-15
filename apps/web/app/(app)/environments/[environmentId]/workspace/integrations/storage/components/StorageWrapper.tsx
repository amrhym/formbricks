"use client";

import { HardDriveIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { TIntegrationStorage, TStorageProvider } from "@hivecfm/types/integration/storage";
import {
  createOrUpdateIntegrationAction,
  deleteIntegrationAction,
} from "@/app/(app)/environments/[environmentId]/workspace/integrations/actions";
import { testStorageConnectionAction } from "@/app/(app)/environments/[environmentId]/workspace/integrations/storage/actions";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

interface StorageWrapperProps {
  environmentId: string;
  storageIntegration: TIntegrationStorage | null;
}

const PROVIDER_LABELS: Record<TStorageProvider, string> = {
  minio: "MinIO",
  azureBlob: "Azure Blob Storage",
  awsS3: "AWS S3",
};

export const StorageWrapper = ({ environmentId, storageIntegration }: StorageWrapperProps) => {
  const existingCreds = storageIntegration?.config?.key;

  const [isConnected, setIsConnected] = useState(!!existingCreds);
  const [integrationId, setIntegrationId] = useState(storageIntegration?.id ?? "");
  const [provider, setProvider] = useState<TStorageProvider>(existingCreds?.provider ?? "minio");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // MinIO fields
  const [endpointUrl, setEndpointUrl] = useState(
    existingCreds?.provider === "minio" ? existingCreds.endpointUrl : ""
  );
  const [forcePathStyle, setForcePathStyle] = useState(
    existingCreds?.provider === "minio" ? (existingCreds.forcePathStyle ?? true) : true
  );

  // Shared S3/MinIO fields
  const [accessKey, setAccessKey] = useState(
    existingCreds && (existingCreds.provider === "minio" || existingCreds.provider === "awsS3")
      ? existingCreds.accessKey
      : ""
  );
  const [secretKey, setSecretKey] = useState(
    existingCreds && (existingCreds.provider === "minio" || existingCreds.provider === "awsS3")
      ? existingCreds.secretKey
      : ""
  );
  const [bucketName, setBucketName] = useState(
    existingCreds && (existingCreds.provider === "minio" || existingCreds.provider === "awsS3")
      ? existingCreds.bucketName
      : ""
  );
  const [region, setRegion] = useState(
    existingCreds?.provider === "minio"
      ? (existingCreds.region ?? "")
      : existingCreds?.provider === "awsS3"
        ? existingCreds.region
        : ""
  );

  // Azure Blob fields
  const [accountName, setAccountName] = useState(
    existingCreds?.provider === "azureBlob" ? existingCreds.accountName : ""
  );
  const [accountKey, setAccountKey] = useState(
    existingCreds?.provider === "azureBlob" ? existingCreds.accountKey : ""
  );
  const [containerName, setContainerName] = useState(
    existingCreds?.provider === "azureBlob" ? existingCreds.containerName : ""
  );

  const buildCredentials = () => {
    if (provider === "minio")
      return {
        provider: "minio" as const,
        endpointUrl,
        accessKey,
        secretKey,
        bucketName,
        region: region || undefined,
        forcePathStyle,
      };
    if (provider === "azureBlob")
      return { provider: "azureBlob" as const, accountName, accountKey, containerName };
    return { provider: "awsS3" as const, accessKey, secretKey, bucketName, region };
  };

  const isFormValid = () => {
    if (provider === "minio") {
      return endpointUrl.trim() && accessKey.trim() && secretKey.trim() && bucketName.trim();
    }
    if (provider === "azureBlob") {
      return accountName.trim() && accountKey.trim() && containerName.trim();
    }
    return accessKey.trim() && secretKey.trim() && bucketName.trim() && region.trim();
  };

  const handleTestConnection = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsTesting(true);
    try {
      const result = await testStorageConnectionAction({
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
          type: "storage",
          config: { key: buildCredentials(), data: [] },
        },
      });
      if (result?.data) {
        setIntegrationId(result.data.id);
        setIsConnected(true);
        toast.success("Storage integration saved successfully");
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
        setProvider("minio");
        setEndpointUrl("");
        setAccessKey("");
        setSecretKey("");
        setBucketName("");
        setRegion("");
        setForcePathStyle(true);
        setAccountName("");
        setAccountKey("");
        setContainerName("");
        setIntegrationId("");
        toast.success("Storage integration disconnected");
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
            <HardDriveIcon className="h-6 w-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">Storage Connected</h3>
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
          {(provider === "minio" || provider === "awsS3") && (
            <>
              <div>
                <Label>Access Key</Label>
                <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(accessKey)}</p>
              </div>
              <div>
                <Label>Secret Key</Label>
                <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(secretKey)}</p>
              </div>
              <div>
                <Label>Bucket Name</Label>
                <p className="mt-1 text-sm text-slate-600">{bucketName}</p>
              </div>
              {provider === "minio" && endpointUrl && (
                <div>
                  <Label>Endpoint URL</Label>
                  <p className="mt-1 text-sm text-slate-600">{endpointUrl}</p>
                </div>
              )}
              {region && (
                <div>
                  <Label>Region</Label>
                  <p className="mt-1 text-sm text-slate-600">{region}</p>
                </div>
              )}
            </>
          )}
          {provider === "azureBlob" && (
            <>
              <div>
                <Label>Account Name</Label>
                <p className="mt-1 text-sm text-slate-600">{accountName}</p>
              </div>
              <div>
                <Label>Account Key</Label>
                <p className="mt-1 font-mono text-sm text-slate-600">{maskValue(accountKey)}</p>
              </div>
              <div>
                <Label>Container Name</Label>
                <p className="mt-1 text-sm text-slate-600">{containerName}</p>
              </div>
            </>
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
        <HardDriveIcon className="h-6 w-6 text-slate-900" />
        <div>
          <h3 className="text-lg font-medium text-slate-900">Connect Storage</h3>
          <p className="text-sm text-slate-500">
            Configure a file storage provider for uploads and attachments.
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="storage-provider">Provider</Label>
          <select
            id="storage-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as TStorageProvider)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="minio">MinIO</option>
            <option value="awsS3">AWS S3</option>
            <option value="azureBlob">Azure Blob Storage</option>
          </select>
        </div>

        {provider === "minio" && (
          <>
            <div>
              <Label htmlFor="storage-endpoint-url">Endpoint URL</Label>
              <Input
                id="storage-endpoint-url"
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://minio.example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-access-key">Access Key</Label>
              <Input
                id="storage-access-key"
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Enter access key"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-secret-key">Secret Key</Label>
              <Input
                id="storage-secret-key"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter secret key"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-bucket-name">Bucket Name</Label>
              <Input
                id="storage-bucket-name"
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-bucket"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-region">Region (optional)</Label>
              <Input
                id="storage-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="storage-force-path-style"
                type="checkbox"
                checked={forcePathStyle}
                onChange={(e) => setForcePathStyle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="storage-force-path-style">Force Path Style</Label>
            </div>
          </>
        )}

        {provider === "awsS3" && (
          <>
            <div>
              <Label htmlFor="storage-access-key">Access Key</Label>
              <Input
                id="storage-access-key"
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Enter AWS access key"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-secret-key">Secret Key</Label>
              <Input
                id="storage-secret-key"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter AWS secret key"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-bucket-name">Bucket Name</Label>
              <Input
                id="storage-bucket-name"
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-s3-bucket"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-region">Region</Label>
              <Input
                id="storage-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
                className="mt-1"
              />
            </div>
          </>
        )}

        {provider === "azureBlob" && (
          <>
            <div>
              <Label htmlFor="storage-account-name">Account Name</Label>
              <Input
                id="storage-account-name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter Azure storage account name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-account-key">Account Key</Label>
              <Input
                id="storage-account-key"
                type="password"
                value={accountKey}
                onChange={(e) => setAccountKey(e.target.value)}
                placeholder="Enter Azure account key"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storage-container-name">Container Name</Label>
              <Input
                id="storage-container-name"
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                placeholder="my-container"
                className="mt-1"
              />
            </div>
          </>
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
