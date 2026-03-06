import { SearchIcon } from "lucide-react";
import { Metadata } from "next";
import { IS_HIVECFM_HUB_CONFIGURED } from "@/lib/constants";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { SemanticSearch } from "./components/semantic-search";

export const metadata: Metadata = {
  title: "Semantic Search",
};

interface InsightsSearchPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const InsightsSearchPage = async ({ params: paramsProps }: InsightsSearchPageProps) => {
  const params = await paramsProps;
  await getEnvironmentAuth(params.environmentId);

  if (!IS_HIVECFM_HUB_CONFIGURED) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle="Semantic Search" />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <SearchIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Search Unavailable</h3>
            <p className="mt-2 text-sm text-slate-500">
              HiveCFM Hub is not configured. Please contact your administrator.
            </p>
          </div>
        </div>
      </PageContentWrapper>
    );
  }

  return (
    <PageContentWrapper>
      <PageHeader pageTitle="Semantic Search" />
      <SemanticSearch environmentId={params.environmentId} />
    </PageContentWrapper>
  );
};
