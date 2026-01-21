"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const GENESYS_ADAPTER_URL = process.env.NEXT_PUBLIC_GENESYS_ADAPTER_URL || "https://hivecfm.xcai.io";

interface ChannelConfigEmbedProps {
  /** Title for accessibility */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Height of the iframe (default: 100%) */
  height?: string | number;
  /** Show loading state */
  showLoading?: boolean;
}

/**
 * Channel Config Embed Component
 *
 * Renders the HiveCFM Genesys Adapter admin UI in an iframe.
 * Provides configuration for channels, IVR surveys, and session monitoring.
 */
export function ChannelConfigEmbed({
  title = "Channel Configuration",
  className,
  height = "100%",
  showLoading = true,
}: ChannelConfigEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const embedUrl = `${GENESYS_ADAPTER_URL}/admin/`;

  useEffect(() => {
    // Reset loading state when component mounts
    setIsLoading(true);
    setError(null);
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load channel configuration");
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      {showLoading && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Loading channel configuration...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              Try Again
            </button>
          </div>
        </div>
      )}

      <iframe
        src={embedUrl}
        title={title}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          border: "none",
          borderRadius: "8px",
        }}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

/**
 * Full-page Channel Config embed with navigation header
 */
export function ChannelConfigFullPage({ title = "Channel Configuration" }: { title?: string }) {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <ChannelConfigEmbed title={title} height="100%" />
      </div>
    </div>
  );
}
