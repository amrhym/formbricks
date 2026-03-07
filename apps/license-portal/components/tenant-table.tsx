"use client";

import { format } from "date-fns";
import { Check, Eye, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TenantRow {
  id: string;
  name: string;
  license: {
    isActive: boolean;
    valid: boolean;
    maxUsers: number;
    maxCompletedResponses: number;
    addonAiInsights: boolean;
    addonCampaignManagement: boolean;
    validUntil: string;
  } | null;
}

function LicenseBadge({ license }: { license: TenantRow["license"] }) {
  if (!license) return <Badge variant="default">No License</Badge>;
  if (!license.isActive) return <Badge variant="error">Inactive</Badge>;
  if (!license.valid) return <Badge variant="warning">Expired</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function BoolIcon({ value }: { value: boolean }) {
  return value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-slate-300" />;
}

export function TenantTable({ tenants }: { tenants: TenantRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Max Users</TableHead>
          <TableHead className="text-right">Max Responses</TableHead>
          <TableHead className="text-center">AI</TableHead>
          <TableHead className="text-center">Campaign</TableHead>
          <TableHead>Valid Until</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell className="font-medium">{tenant.name}</TableCell>
            <TableCell>
              <LicenseBadge license={tenant.license} />
            </TableCell>
            <TableCell className="text-right">{tenant.license?.maxUsers ?? "-"}</TableCell>
            <TableCell className="text-right">{tenant.license?.maxCompletedResponses ?? "-"}</TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center">
                <BoolIcon value={tenant.license?.addonAiInsights ?? false} />
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center">
                <BoolIcon value={tenant.license?.addonCampaignManagement ?? false} />
              </div>
            </TableCell>
            <TableCell>
              {tenant.license?.validUntil ? format(new Date(tenant.license.validUntil), "MMM d, yyyy") : "-"}
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/dashboard/${tenant.id}`}>
                <Button variant="ghost" size="sm">
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
        {tenants.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-slate-500">
              No tenants found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
