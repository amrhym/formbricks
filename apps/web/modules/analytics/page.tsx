import { BarChart3Icon, ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/ui/components/tabs";
import { ChannelConfigEmbed } from "./components/ChannelConfigEmbed";
import { MetabaseEmbed } from "./components/MetabaseEmbed";
import { SupersetEmbed } from "./components/SupersetEmbed";
import { getMetabaseBaseUrl, getMetabaseDashboardUrl } from "./lib/metabase";

const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || "https://superset.hivecfm.xcai.io";
const METABASE_URL = process.env.NEXT_PUBLIC_METABASE_URL || "https://metabase.hivecfm.xcai.io";
const GENESYS_ADAPTER_URL = process.env.NEXT_PUBLIC_GENESYS_ADAPTER_URL || "https://hivecfm.xcai.io";

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

  // Get the embed URL for Metabase
  let metabaseEmbedUrl = "";
  let metabaseConfigured = false;

  try {
    const metabaseUrl = getMetabaseBaseUrl();
    if (metabaseUrl && process.env.METABASE_SECRET_KEY) {
      metabaseEmbedUrl = await getMetabaseDashboardUrl(DEFAULT_DASHBOARD_ID);
      metabaseConfigured = true;
    }
  } catch (error) {
    console.error("Failed to generate Metabase embed URL:", error);
  }

  // Check if Superset is configured
  const supersetConfigured = true; // Superset available at superset.hivecfm.xcai.io

  // Check if Genesys Adapter is configured (always true for now)
  const channelConfigEnabled = true;

  const AnalyticsButtons = () => {
    return (
      <div className="flex gap-2">
        {channelConfigEnabled && (
          <Button size="sm" variant="secondary" asChild>
            <Link href={`${GENESYS_ADAPTER_URL}/admin/`} target="_blank" rel="noopener noreferrer">
              Open Channel Config
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {metabaseConfigured && (
          <Button size="sm" variant="secondary" asChild>
            <Link href={METABASE_URL} target="_blank" rel="noopener noreferrer">
              Open Metabase
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {supersetConfigured && (
          <Button size="sm" variant="secondary" asChild>
            <Link href={SUPERSET_URL} target="_blank" rel="noopener noreferrer">
              Open Superset
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
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

  // If neither is configured, show setup message
  if (!metabaseConfigured && !supersetConfigured) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle={t("common.analytics") || "Analytics"} />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <BarChart3Icon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Analytics Setup Required</h3>
            <p className="mt-2 text-sm text-slate-500">
              Please configure Metabase or Superset to enable analytics.
            </p>
          </div>
        </div>
      </PageContentWrapper>
    );
  }

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.analytics") || "Analytics"} cta={<AnalyticsButtons />} />
      <Tabs defaultValue="channel-config" className="w-full">
        <TabsList className="mb-4">
          {channelConfigEnabled && <TabsTrigger value="channel-config">Channel Config</TabsTrigger>}
          {supersetConfigured && <TabsTrigger value="superset">Superset</TabsTrigger>}
          {metabaseConfigured && <TabsTrigger value="metabase">Metabase</TabsTrigger>}
        </TabsList>

        {channelConfigEnabled && (
          <TabsContent value="channel-config" className="h-[calc(100vh-240px)] min-h-[600px]">
            <ChannelConfigEmbed title="Channel Configuration" height="100%" />
          </TabsContent>
        )}

        {supersetConfigured && (
          <TabsContent value="superset" className="h-[calc(100vh-240px)] min-h-[600px]">
            <SupersetEmbed title="Superset Analytics" height="100%" />
          </TabsContent>
        )}

        {metabaseConfigured && (
          <TabsContent value="metabase" className="h-[calc(100vh-240px)] min-h-[600px]">
            <MetabaseEmbed embedUrl={metabaseEmbedUrl} title="Metabase Analytics" height="100%" />
          </TabsContent>
        )}
      </Tabs>
    </PageContentWrapper>
  );
};
