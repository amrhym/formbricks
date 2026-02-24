"use client";

import { useEffect, useState } from "react";

interface SupersetDashboardProps {
  dashboardName: string;
  className?: string;
}

export function SupersetDashboard({ dashboardName, className }: SupersetDashboardProps) {
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supersetBaseUrl = process.env.NEXT_PUBLIC_SUPERSET_BASE_URL || "";

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(
          `/api/v1/management/analytics/superset-token?dashboard=${encodeURIComponent(dashboardName)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch guest token: ${response.status}`);
        }

        const { data } = await response.json();
        setGuestToken(data.guestToken);
        setDashboardId(data.dashboardId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [dashboardName]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className || ""}`}>
        <div className="text-sm text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className || ""}`}>
        <div className="text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!guestToken || !dashboardId || !supersetBaseUrl) {
    return null;
  }

  const iframeSrc = `${supersetBaseUrl}/superset/dashboard/${dashboardId}/?standalone=true&guest_token=${guestToken}`;

  return (
    <iframe
      src={iframeSrc}
      className={`w-full border-0 ${className || ""}`}
      style={{ minHeight: "600px" }}
      title={`Dashboard: ${dashboardName}`}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
