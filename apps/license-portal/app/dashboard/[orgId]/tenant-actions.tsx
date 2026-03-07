"use client";

import { Copy, Pencil, Plus } from "lucide-react";
import { LicenseForm } from "@/components/license-form";
import { Button } from "@/components/ui/button";
import type { LicenseStatus } from "@/lib/api-client";

interface TenantActionsProps {
  orgId: string;
  license: LicenseStatus | null;
}

export function TenantActions({ orgId, license }: TenantActionsProps) {
  const copyKey = () => {
    if (license?.licenseKey) {
      navigator.clipboard.writeText(license.licenseKey);
    }
  };

  if (!license) {
    return (
      <LicenseForm
        orgId={orgId}
        mode="create"
        trigger={
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            Create License
          </Button>
        }
      />
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
        initialData={{
          maxUsers: license.maxUsers,
          maxCompletedResponses: license.maxCompletedResponses,
          addonAiInsights: license.addonAiInsights,
          addonCampaignManagement: license.addonCampaignManagement,
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
    </div>
  );
}
