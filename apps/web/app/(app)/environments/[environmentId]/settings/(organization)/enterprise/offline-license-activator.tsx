"use client";

import { CheckIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/modules/ui/components/button";
import { activateOfflineLicenseAction } from "./actions";

interface OfflineLicenseActivatorProps {
  organizationId: string;
}

export function OfflineLicenseActivator({ organizationId }: OfflineLicenseActivatorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleActivate = useCallback(
    async (tokenValue: string) => {
      const trimmed = tokenValue.trim();
      if (!trimmed) {
        setStatus("error");
        setMessage("No license token provided.");
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const result = await activateOfflineLicenseAction({ organizationId, token: trimmed });
        if (result?.data) {
          setStatus("success");
          setMessage("License activated successfully!");
          setToken("");
          router.refresh();
        } else {
          setStatus("error");
          setMessage(result?.serverError || result?.validationErrors?.toString() || "Activation failed.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "An unexpected error occurred.");
      }
    },
    [organizationId, router]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = (ev.target?.result as string) || "";
        setToken(content.trim());
        handleActivate(content.trim());
      };
      reader.readAsText(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleActivate]
  );

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Offline License Activation</h3>
      <p className="mt-1 text-sm text-slate-500">
        Upload a <code className="rounded bg-slate-100 px-1 text-xs">.hcfm-license</code> file or paste a
        license token to activate your license offline.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".hcfm-license,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "loading"}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload .hcfm-license file
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or paste token
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your license token here..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          rows={3}
          disabled={status === "loading"}
        />

        <Button onClick={() => handleActivate(token)} disabled={status === "loading" || !token.trim()}>
          {status === "loading" ? "Activating..." : "Activate License"}
        </Button>

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckIcon className="h-4 w-4" />
            {message}
          </div>
        )}
        {status === "error" && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </div>
  );
}
