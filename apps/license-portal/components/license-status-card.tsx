"use client";

import { format, formatDistanceToNow, isPast } from "date-fns";
import { Calendar, Clock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LicenseStatusCardProps {
  license: {
    isActive: boolean;
    valid: boolean;
    validFrom: string;
    validUntil: string;
    licenseKey: string;
  };
}

export function LicenseStatusCard({ license }: LicenseStatusCardProps) {
  const expired = isPast(new Date(license.validUntil));
  const expiryText = expired
    ? `Expired ${formatDistanceToNow(new Date(license.validUntil))} ago`
    : `Expires in ${formatDistanceToNow(new Date(license.validUntil))}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">License Status</CardTitle>
        <Shield className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {license.valid ? (
              <Badge variant="success">Active & Valid</Badge>
            ) : !license.isActive ? (
              <Badge variant="error">Inactive</Badge>
            ) : (
              <Badge variant="warning">Expired</Badge>
            )}
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Valid from {format(new Date(license.validFrom), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{expiryText}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
