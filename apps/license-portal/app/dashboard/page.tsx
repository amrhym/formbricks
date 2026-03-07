import { TenantTable } from "@/components/tenant-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tenant Licenses</h1>
        <p className="text-sm text-slate-500">Manage licenses for all HiveCFM tenants</p>
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
          <TenantTable tenants={tenants} />
        </CardContent>
      </Card>
    </div>
  );
}
