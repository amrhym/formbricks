import { BarChart3Icon, ExternalLinkIcon } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { Button } from "@/modules/ui/components/button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { SupersetEmbed } from "./components/SupersetEmbed";

const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL || "https://superset.hivecfm.xcai.io";

export const metadata: Metadata = {
  title: "Analytics",
};

interface AnalyticsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const AnalyticsPage = async ({ params: paramsProps }: AnalyticsPageProps) => {
  const params = await paramsProps;
  const t = await getTranslate();

  const { isBilling } = await getEnvironmentAuth(params.environmentId);

  const AnalyticsButtons = () => {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href={SUPERSET_URL} target="_blank" rel="noopener noreferrer">
            Open in new tab
            <ExternalLinkIcon className="ml-2 h-4 w-4" />
          </Link>
        </Button>
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

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.analytics") || "Analytics"} cta={<AnalyticsButtons />} />
      <div className="h-[calc(100vh-200px)] min-h-[600px]">
        <SupersetEmbed environmentId={params.environmentId} height="100%" />
      </div>
    </PageContentWrapper>
  );
};
