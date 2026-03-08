"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface LicenseFormProps {
  orgId: string;
  mode: "create" | "edit";
  initialData?: {
    maxUsers: number;
    maxCompletedResponses: number;
    addonAiInsights: boolean;
    addonCampaignManagement: boolean;
    validFrom?: string;
    validUntil: string;
    isActive?: boolean;
  };
  trigger: React.ReactNode;
}

export function LicenseForm({ orgId, mode, initialData, trigger }: LicenseFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [maxUsers, setMaxUsers] = useState(initialData?.maxUsers ?? 10);
  const [maxResponses, setMaxResponses] = useState(initialData?.maxCompletedResponses ?? 10000);
  const [aiInsights, setAiInsights] = useState(initialData?.addonAiInsights ?? false);
  const [campaign, setCampaign] = useState(initialData?.addonCampaignManagement ?? false);
  const [validUntil, setValidUntil] = useState(
    initialData?.validUntil ? new Date(initialData.validUntil).toISOString().split("T")[0] : ""
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: any = {
      maxUsers,
      maxCompletedResponses: maxResponses,
      addonAiInsights: aiInsights,
      addonCampaignManagement: campaign,
      validUntil: new Date(validUntil).toISOString(),
    };

    if (mode === "edit") {
      body.isActive = isActive;
    }

    try {
      const url = `/api/license/${orgId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMessage = "Failed to save license";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create License" : "Edit License"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResponses">Max Responses/Year</Label>
              <Input
                id="maxResponses"
                type="number"
                min={1}
                value={maxResponses}
                onChange={(e) => setMaxResponses(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid Until</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai">AI Insights Addon</Label>
              <Switch id="ai" checked={aiInsights} onCheckedChange={setAiInsights} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="campaign">Campaign Management Addon</Label>
              <Switch id="campaign" checked={campaign} onCheckedChange={setCampaign} />
            </div>
            {mode === "edit" && (
              <div className="flex items-center justify-between">
                <Label htmlFor="active">License Active</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {mode === "create" ? "Create License" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
