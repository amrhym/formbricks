import { AddOfflineOrgForm } from "@/components/add-offline-org-form";
import { TenantTable } from "@/components/tenant-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { getOfflineOrgs } from "@/lib/offline-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let tenants: any[] = [];
  let error = "";

  try {
    const rawTenants = await apiClient.listTenants();

    // Enrich with license data
    tenants = await Promise.all(
      rawTenants.map(async (t: any) => {
        const org = t.organization || t;
        const orgId = org.id;
        const license = await apiClient.getLicenseStatus(orgId);
        return {
          id: orgId,
          name: org.name,
          license: license
            ? {
                isActive: license.isActive,
                valid: license.valid,
                maxUsers: license.maxUsers,
                maxCompletedResponses: license.maxCompletedResponses,
                addonAiInsights: license.addonAiInsights,
                addonCampaignManagement: license.addonCampaignManagement,
                validUntil: license.validUntil,
              }
            : null,
        };
      })
    );
  } catch (e: any) {
    error = e.message || "Failed to load tenants";
  }

  // Load offline orgs — this should always work even if API is unreachable
  let offlineOrgs: any[] = [];
  try {
    const rawOffline = getOfflineOrgs();
    offlineOrgs = rawOffline.map((o) => ({
      id: o.id,
      name: o.name,
      isOffline: true,
      license: o.license
        ? {
            isActive: o.license.isActive,
            valid: o.license.isActive && new Date(o.license.validUntil) > new Date(),
            maxUsers: o.license.maxUsers,
            maxCompletedResponses: o.license.maxCompletedResponses,
            addonAiInsights: o.license.addonAiInsights,
            addonCampaignManagement: o.license.addonCampaignManagement,
            validUntil: o.license.validUntil,
          }
        : null,
    }));
  } catch {
    // Non-critical — offline store may not be available
  }

  const allTenants = [...tenants, ...offlineOrgs];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Licenses</h1>
          <p className="text-sm text-slate-500">Manage licenses for all HiveCFM tenants</p>
        </div>
        <AddOfflineOrgForm />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantTable tenants={allTenants} />
        </CardContent>
      </Card>
    </div>
  );
}
