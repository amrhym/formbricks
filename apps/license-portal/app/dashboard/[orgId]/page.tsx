import { ArrowLeft, BarChart3, Key, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseStatusCard } from "@/components/license-status-card";
import { OfflineTokenGenerator } from "@/components/offline-token-generator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageBar } from "@/components/usage-chart";
import { apiClient } from "@/lib/api-client";
import { TenantActions } from "./tenant-actions";

export default async function TenantDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  let tenant;
  let license;

  try {
    tenant = await apiClient.getTenant(orgId);
    license = await apiClient.getLicenseStatus(orgId);
  } catch {
    notFound();
  }

  const org = tenant.organization || (tenant as any);
  const name = org.name || orgId;

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
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          <p className="text-sm text-slate-500">Tenant ID: {orgId}</p>
        </div>
      </div>

      {!license ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-700">No License</h3>
            <p className="mb-6 text-sm text-slate-500">This tenant doesn&apos;t have a license yet.</p>
            <TenantActions orgId={orgId} license={null} />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <LicenseStatusCard license={license} />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageBar
                  label="Completed Responses"
                  current={license.usage.completedResponsesThisMonth}
                  max={license.maxCompletedResponses}
                />
                <UsageBar label="Active Users" current={license.usage.currentUsers} max={license.maxUsers} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
                    <span className="text-sm text-slate-600">Max Responses/Month</span>
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
                <TenantActions orgId={orgId} license={license} />
              </div>
            </CardContent>
          </Card>

          <OfflineTokenGenerator orgId={orgId} />
        </>
      )}
    </div>
  );
}
