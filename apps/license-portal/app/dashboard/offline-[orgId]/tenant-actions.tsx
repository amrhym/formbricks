"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LicenseForm } from "@/components/license-form";
import { Button } from "@/components/ui/button";

interface OfflineOrgLicense {
  licenseKey: string;
  maxUsers: number;
  maxCompletedResponses: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface OfflineTenantActionsProps {
  orgId: string;
  license: OfflineOrgLicense | null;
}

export function OfflineTenantActions({ orgId, license }: OfflineTenantActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const copyKey = () => {
    if (license?.licenseKey) {
      navigator.clipboard.writeText(license.licenseKey);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this offline organization? This action cannot be undone.")
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/offline-org/${orgId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!license) {
    return (
      <div className="flex items-center gap-2">
        <LicenseForm
          orgId={orgId}
          mode="create"
          offline
          trigger={
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Create License
            </Button>
          }
        />
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Delete Org
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={copyKey}>
        <Copy className="mr-1 h-3.5 w-3.5" />
        Copy
      </Button>
      <LicenseForm
        orgId={orgId}
        mode="edit"
        offline
        initialData={{
          maxUsers: license.maxUsers,
          maxCompletedResponses: license.maxCompletedResponses,
          addonAiInsights: license.addonAiInsights,
          addonCampaignManagement: license.addonCampaignManagement,
          validFrom: license.validFrom,
          validUntil: license.validUntil,
          isActive: license.isActive,
        }}
        trigger={
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete Org
      </Button>
    </div>
  );
}
