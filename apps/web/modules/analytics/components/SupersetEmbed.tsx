"use client";

import { AlertCircleIcon, BarChart3Icon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/modules/ui/components/button";
import { LoadingSpinner } from "@/modules/ui/components/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";

const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_BASE_URL || "https://superset.hivecfm.xcai.io";

// Token refresh interval: refresh 2 minutes before the 15-min expiry
const TOKEN_REFRESH_INTERVAL_MS = 13 * 60 * 1000;

interface DashboardTemplate {
  id: string;
  name: string;
  description: string | null;
  supersetDashboardId: string;
}

interface GuestTokenResponse {
  guestToken: string;
  dashboardId: string;
  expiresAt: string;
}

interface SupersetEmbedProps {
  environmentId: string;
  height?: string;
}

export const SupersetEmbed = ({ environmentId, height = "100%" }: SupersetEmbedProps) => {
  const [dashboards, setDashboards] = useState<DashboardTemplate[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [guestToken, setGuestToken] = useState<GuestTokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const response = await fetch("/api/v1/integrations/analytics/dashboards", {
          headers: { environmentId },
        });

        if (!response.ok) {
          throw new Error(`Failed to load dashboards: ${response.status}`);
        }

        const { data } = await response.json();
        setDashboards(data);
        if (data.length > 0) {
          setSelectedDashboard(data[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboards");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, [environmentId]);

  // Fetch guest token for the selected dashboard
  const fetchGuestToken = useCallback(
    async (dashboardName: string, isRefresh = false) => {
      if (!isRefresh) {
        setTokenLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/integrations/analytics/superset-token?dashboard=${encodeURIComponent(dashboardName)}`,
          { headers: { environmentId } }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard token: ${response.status}`);
        }

        const { data } = await response.json();
        setGuestToken(data);
      } catch (err) {
        if (!isRefresh) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!isRefresh) {
          setTokenLoading(false);
        }
      }
    },
    [environmentId]
  );

  // Fetch token when dashboard selection changes
  useEffect(() => {
    if (!selectedDashboard) return;

    fetchGuestToken(selectedDashboard);
  }, [selectedDashboard, fetchGuestToken]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!guestToken || !selectedDashboard) return;

    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up periodic refresh
    refreshTimerRef.current = setInterval(() => {
      fetchGuestToken(selectedDashboard, true);
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [guestToken, selectedDashboard, fetchGuestToken]);

  const currentDashboard = dashboards.find((d) => d.name === selectedDashboard);

  const iframeSrc =
    guestToken && guestToken.dashboardId
      ? `${SUPERSET_URL}/superset/dashboard/${guestToken.dashboardId}/?standalone=true&guest_token=${guestToken.guestToken}`
      : null;

  // Loading state: fetching dashboard list
  if (loading) {
    return (
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-slate-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state: failed to load dashboards
  if (error && !guestToken) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        style={{ height }}>
        <AlertCircleIcon className="h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-700">Unable to Load Analytics</h3>
        <p className="mt-2 max-w-md text-center text-sm text-slate-500">{error}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => {
            setError(null);
            setLoading(true);
            window.location.reload();
          }}>
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // No dashboards configured
  if (dashboards.length === 0) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        style={{ height }}>
        <BarChart3Icon className="h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-700">No Dashboards Configured</h3>
        <p className="mt-2 max-w-md text-center text-sm text-slate-500">
          No analytics dashboards have been set up yet. Visit Superset to create dashboards.
        </p>
        <Button variant="secondary" size="sm" className="mt-4" asChild>
          <a href={SUPERSET_URL} target="_blank" rel="noopener noreferrer">
            Open Superset
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Dashboard selector */}
      {dashboards.length > 1 && (
        <div className="flex items-center gap-3">
          <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((dashboard) => (
                <SelectItem key={dashboard.id} value={dashboard.name}>
                  {dashboard.name}
                  {dashboard.description && (
                    <span className="ml-2 text-xs text-slate-400">- {dashboard.description}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentDashboard?.description && (
            <span className="text-sm text-slate-500">{currentDashboard.description}</span>
          )}
        </div>
      )}

      {/* Dashboard iframe or loading state */}
      <div
        className="relative flex-1 overflow-hidden rounded-lg border border-slate-200"
        style={{ minHeight: "600px" }}>
        {tokenLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner />
              <p className="text-sm text-slate-500">Loading dashboard...</p>
            </div>
          </div>
        )}
        {iframeSrc && !tokenLoading && (
          <iframe
            src={iframeSrc}
            className="h-full w-full border-0"
            title={`Dashboard: ${selectedDashboard}`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  );
};
