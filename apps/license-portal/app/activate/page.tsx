"use client";

import { format } from "date-fns";
import { Check, KeyRound, X } from "lucide-react";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ActivateContent() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "License key not found");
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activate License</h1>
            <p className="text-sm text-slate-500">Verify a license key and view its details</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                License Key Verification
              </CardTitle>
              <CardDescription>Enter a license key in the format HCFM-XXXX-XXXX-XXXX-XXXX</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input
                    id="licenseKey"
                    placeholder="HCFM-XXXX-XXXX-XXXX-XXXX"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <Button type="submit" loading={loading}>
                  Verify
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-4">
                <X className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Verification Result
                  <Badge variant={result.valid ? "success" : "error"}>
                    {result.valid ? "Valid" : "Invalid"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Organization ID</dt>
                    <dd className="font-mono">{result.organizationId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Active</dt>
                    <dd>
                      {result.isActive ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Max Users</dt>
                    <dd>{result.maxUsers}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Max Responses</dt>
                    <dd>{result.maxCompletedResponses}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">AI Insights</dt>
                    <dd>{result.addonAiInsights ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Campaign Mgmt</dt>
                    <dd>{result.addonCampaignManagement ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Valid From</dt>
                    <dd>{format(new Date(result.validFrom), "MMM d, yyyy")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Valid Until</dt>
                    <dd>{format(new Date(result.validUntil), "MMM d, yyyy")}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <SessionProvider>
      <ActivateContent />
    </SessionProvider>
  );
}
