"use client";

import { Plus } from "lucide-react";
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

export function AddOfflineOrgForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/offline-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), id: orgId.trim() || undefined }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create offline organization";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      setOpen(false);
      setName("");
      setOrgId("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Offline Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Offline Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgId">Organization ID</Label>
            <Input
              id="orgId"
              type="text"
              placeholder="e.g. cmmntw1f90001ay0185s7y6wk"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              The exact Organization ID from the disconnected HiveCFM instance. Find it in Settings &gt;
              General. Leave blank to auto-generate.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="e.g. Acme Corp (Air-Gapped)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
