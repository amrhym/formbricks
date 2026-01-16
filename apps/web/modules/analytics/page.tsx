import { BarChart3Icon, ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { MetabaseEmbed } from "./components/MetabaseEmbed";
import { getMetabaseBaseUrl, getMetabaseDashboardUrl } from "./lib/metabase";

export const metadata: Metadata = {
  title: "Analytics",
};

interface AnalyticsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

// Default dashboard ID - this should be configured per organization
const DEFAULT_DASHBOARD_ID = 1;

export const AnalyticsPage = async ({ params: paramsProps }: AnalyticsPageProps) => {
  const params = await paramsProps;
  const t = await getTranslate();

  const { isBilling } = await getEnvironmentAuth(params.environmentId);

  // Get the embed URL for the default dashboard
  let embedUrl = "";
  let metabaseError = "";

  try {
    // Check if Metabase is configured
    const metabaseUrl = getMetabaseBaseUrl();
    if (metabaseUrl && process.env.METABASE_SECRET_KEY) {
      embedUrl = await getMetabaseDashboardUrl(DEFAULT_DASHBOARD_ID);
    } else {
      metabaseError = "Analytics not configured. Please contact your administrator.";
    }
  } catch (error) {
    console.error("Failed to generate Metabase embed URL:", error);
    metabaseError = "Failed to load analytics dashboard.";
  }

  const OpenMetabaseButton = () => {
    const metabaseUrl = getMetabaseBaseUrl();
    return (
      <Button size="sm" variant="secondary" asChild>
        <Link href={metabaseUrl} target="_blank" rel="noopener noreferrer">
          Open in Metabase
          <ExternalLinkIcon className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    );
  };

  if (isBilling) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle={t("common.analytics") || "Analytics"} />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <BarChart3Icon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Analytics Unavailable</h3>
            <p className="mt-2 text-sm text-slate-500">
              Please upgrade your plan to access analytics features.
            </p>
          </div>
        </div>
      </PageContentWrapper>
    );
  }

  if (metabaseError) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle={t("common.analytics") || "Analytics"} />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <BarChart3Icon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Analytics Setup Required</h3>
            <p className="mt-2 text-sm text-slate-500">{metabaseError}</p>
          </div>
        </div>
      </PageContentWrapper>
    );
  }

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.analytics") || "Analytics"} cta={<OpenMetabaseButton />} />
      <div className="h-[calc(100vh-180px)] min-h-[600px]">
        <MetabaseEmbed embedUrl={embedUrl} title="Analytics Dashboard" height="100%" />
      </div>
    </PageContentWrapper>
  );
};
