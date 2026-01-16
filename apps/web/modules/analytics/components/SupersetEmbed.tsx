"use client";

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
  const supersetUrl = process.env.NEXT_PUBLIC_SUPERSET_URL || "/superset/welcome/";
  const embedUrl = dashboardId ? `/superset/dashboard/${dashboardId}/` : supersetUrl;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ height }}>
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
      />
    </div>
  );
};

export const SupersetFullPage = ({ title = "Superset" }: { title?: string }) => {
  const supersetUrl = process.env.NEXT_PUBLIC_SUPERSET_URL || "/superset/welcome/";

  return (
    <div className="h-screen w-full">
      <iframe
        src={supersetUrl}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
      />
    </div>
  );
};
