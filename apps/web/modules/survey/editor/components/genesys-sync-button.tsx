"use client";

import { CloudUploadIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/modules/ui/components/button";
import { syncToGenesysAction } from "../genesys-sync-action";

interface GenesysSyncButtonProps {
  surveyId: string;
  environmentId: string;
}

export const GenesysSyncButton = ({ surveyId, environmentId }: GenesysSyncButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await syncToGenesysAction({ surveyId, environmentId });

      if (response?.data) {
        const result = response.data;
        if (result.success) {
          if (result.synced === 0 && result.total === 0) {
            toast.success("No audio prompts to sync");
          } else {
            toast.success(`Synced ${result.synced}/${result.total} audio prompts to Genesys Cloud`);
          }
        } else {
          const errorSummary = result.errors.length > 0 ? result.errors[0] : "Unknown error";
          toast.error(`Genesys sync failed: ${errorSummary}`);
          if (result.errors.length > 1) {
            console.error("All Genesys sync errors:", result.errors);
          }
        }
      } else {
        toast.error("Failed to sync to Genesys Cloud");
      }
    } catch (error) {
      toast.error("Failed to sync to Genesys Cloud");
      console.error("Genesys sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" loading={isSyncing} onClick={handleSync}>
      <CloudUploadIcon className="h-4 w-4" />
      Sync to Genesys
    </Button>
  );
};
