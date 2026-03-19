import { ArrowLeft, Key, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseStatusCard } from "@/components/license-status-card";
import { OfflineTokenGenerator } from "@/components/offline-token-generator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOfflineOrg } from "@/lib/offline-store";
import { OfflineTenantActions } from "./tenant-actions";

export const dynamic = "force-dynamic";

export default async function OfflineTenantDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const org = getOfflineOrg(orgId);
  if (!org) {
    notFound();
  }

  const license = org.license;

  // Build a license-status-like object for the LicenseStatusCard
  const licenseStatus = license
    ? {
        isActive: license.isActive,
        valid: license.isActive && new Date(license.validUntil) > new Date(),
        validFrom: license.validFrom,
        validUntil: license.validUntil,
        licenseKey: license.licenseKey,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
            <Badge variant="default">Offline</Badge>
          </div>
          <p className="text-sm text-slate-500">Offline Org ID: {orgId}</p>
        </div>
      </div>

      {!license ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700">No License</h3>
            <p className="mb-6 text-sm text-slate-500">
              This offline organization doesn&apos;t have a license yet.
            </p>
            <OfflineTenantActions orgId={orgId} license={null} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {licenseStatus && <LicenseStatusCard license={licenseStatus} />}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Addons</CardTitle>
                <Puzzle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">AI Insights</span>
                    <Badge variant={license.addonAiInsights ? "success" : "default"}>
                      {license.addonAiInsights ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Campaign Management</span>
                    <Badge variant={license.addonCampaignManagement ? "success" : "default"}>
                      {license.addonCampaignManagement ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Limits</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Max Users</span>
                    <span className="font-medium">{license.maxUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Max Responses/Year</span>
                    <span className="font-medium">{license.maxCompletedResponses.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">License Key</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <code className="rounded bg-slate-100 px-3 py-2 font-mono text-sm">{license.licenseKey}</code>
                <OfflineTenantActions orgId={orgId} license={license} />
              </div>
            </CardContent>
          </Card>

          <OfflineTokenGenerator orgId={orgId} offline />
        </>
      )}
    </div>
  );
}
