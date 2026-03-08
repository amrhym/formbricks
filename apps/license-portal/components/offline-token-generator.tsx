"use client";

import { Check, Copy, Download, Loader2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OfflineTokenGeneratorProps {
  orgId: string;
}

interface TokenPayload {
  orgName: string;
  licenseKey: string;
  maxCompletedResponses: number;
  maxUsers: number;
  addonAiInsights: boolean;
  addonCampaignManagement: boolean;
  validFrom: string;
  validUntil: string;
}

export function OfflineTokenGenerator({ orgId }: OfflineTokenGeneratorProps) {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    setToken(null);
    setPayload(null);

    try {
      const res = await fetch(`/api/license/${orgId}/offline-token`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate token");
      }

      setToken(data.token);

      // Decode payload for display
      try {
        const payloadPart = data.token.split(".")[0];
        const decoded = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
        setPayload(decoded);
      } catch {
        // Non-critical — just won't show payload summary
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadToken = () => {
    if (!token) return;
    const blob = new Blob([token], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${orgId}.hcfm-license`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Offline Activation Token</CardTitle>
        <WifiOff className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Generate a signed token to activate this license on air-gapped or isolated HiveCFM Core deployments.
        </p>

        {!token ? (
          <Button onClick={generateToken} disabled={loading} variant="outline" className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <WifiOff className="mr-2 h-4 w-4" />
                Generate Offline Token
              </>
            )}
          </Button>
        ) : (
          <>
            <textarea
              readOnly
              value={token}
              rows={4}
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:outline-none"
            />

            <div className="flex gap-2">
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                {copied ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button onClick={downloadToken} variant="outline" size="sm">
                <Download className="mr-1 h-3.5 w-3.5" />
                Download .hcfm-license
              </Button>
            </div>

            {payload && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Token Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">Organization</span>
                  <span className="font-medium text-slate-700">{payload.orgName}</span>
                  <span className="text-slate-500">License Key</span>
                  <span className="font-mono text-slate-700">{payload.licenseKey}</span>
                  <span className="text-slate-500">Max Users</span>
                  <span className="text-slate-700">{payload.maxUsers.toLocaleString()}</span>
                  <span className="text-slate-500">Max Responses</span>
                  <span className="text-slate-700">{payload.maxCompletedResponses.toLocaleString()}</span>
                  <span className="text-slate-500">AI Insights</span>
                  <span className="text-slate-700">{payload.addonAiInsights ? "Yes" : "No"}</span>
                  <span className="text-slate-500">Campaign Mgmt</span>
                  <span className="text-slate-700">{payload.addonCampaignManagement ? "Yes" : "No"}</span>
                  <span className="text-slate-500">Valid From</span>
                  <span className="text-slate-700">{new Date(payload.validFrom).toLocaleDateString()}</span>
                  <span className="text-slate-500">Valid Until</span>
                  <span className="text-slate-700">{new Date(payload.validUntil).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <Button onClick={generateToken} variant="ghost" size="sm" className="text-slate-500">
              Regenerate Token
            </Button>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
