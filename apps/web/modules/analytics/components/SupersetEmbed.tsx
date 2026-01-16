"use client";

import { BarChart3Icon, ExternalLinkIcon } from "lucide-react";

const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || "https://superset.hivecfm.xcai.io";

interface SupersetEmbedProps {
  dashboardId?: string;
  title?: string;
  height?: string;
}

export const SupersetEmbed = ({
  dashboardId,
  title = "Superset Dashboard",
  height = "600px",
}: SupersetEmbedProps) => {
  const dashboardUrl = dashboardId
    ? `${SUPERSET_URL}/superset/dashboard/${dashboardId}/`
    : `${SUPERSET_URL}/superset/welcome/`;

  return (
    <div
      className="flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      style={{ height }}>
      <BarChart3Icon className="mx-auto h-16 w-16 text-slate-400" />
      <h3 className="mt-4 text-lg font-medium text-slate-700">{title}</h3>
      <p className="mt-2 max-w-md text-center text-sm text-slate-500">
        Apache Superset provides advanced analytics and data visualization. Click below to open in a new tab.
      </p>
      <a
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
        Open Superset
        <ExternalLinkIcon className="ml-2 h-4 w-4" />
      </a>
    </div>
  );
};

export const SupersetFullPage = ({ title = "Superset" }: { title?: string }) => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
      <BarChart3Icon className="mx-auto h-16 w-16 text-slate-400" />
      <h3 className="mt-4 text-lg font-medium text-slate-700">{title}</h3>
      <p className="mt-2 max-w-md text-center text-sm text-slate-500">
        Apache Superset provides advanced analytics and data visualization.
      </p>
      <a
        href={`${SUPERSET_URL}/superset/welcome/`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
        Open Superset
        <ExternalLinkIcon className="ml-2 h-4 w-4" />
      </a>
    </div>
  );
};
