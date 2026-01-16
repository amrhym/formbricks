"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface MetabaseEmbedProps {
  /** The embed URL (generated server-side) */
  embedUrl: string;
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
 * Metabase Embed Component
 *
 * Renders a Metabase dashboard or question in an iframe.
 * The embed URL should be generated server-side using signed JWT tokens.
 */
export function MetabaseEmbed({
  embedUrl,
  title = "Analytics Dashboard",
  className,
  height = "100%",
  showLoading = true,
}: MetabaseEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
    setError(null);
  }, [embedUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load analytics dashboard");
  };

  if (!embedUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8">
        <p className="text-slate-500">No dashboard configured</p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {showLoading && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">Loading analytics...</p>
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
 * Full-page Metabase embed with navigation header
 */
export function MetabaseFullPage({ embedUrl, title = "Analytics" }: { embedUrl: string; title?: string }) {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <MetabaseEmbed embedUrl={embedUrl} title={title} height="100%" />
      </div>
    </div>
  );
}
