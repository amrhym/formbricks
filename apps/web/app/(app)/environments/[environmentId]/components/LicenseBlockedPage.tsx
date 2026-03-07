"use client";

import { AlertTriangleIcon } from "lucide-react";

interface LicenseBlockedPageProps {
  reason?: string;
}

export const LicenseBlockedPage = ({ reason }: LicenseBlockedPageProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-4 max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangleIcon className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">License Required</h1>
        <p className="mb-4 text-sm text-slate-600">
          {reason || "Your organization's license is invalid or has expired."}
        </p>
        <p className="text-xs text-slate-500">Please contact your administrator to resolve this issue.</p>
      </div>
    </div>
  );
};
