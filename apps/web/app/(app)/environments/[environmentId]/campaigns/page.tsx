import { MegaphoneIcon } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCampaignEnabledForEnvironment } from "@/lib/ai/permissions";
import { getCampaignsByEnvironmentId } from "@/lib/campaign/service";
import { getSurveys } from "@/lib/survey/service";
import { getTranslate } from "@/lingodotdev/server";
import { getSegments } from "@/modules/ee/contacts/segments/lib/segments";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { CampaignList } from "./components/campaign-list";

export const metadata: Metadata = {
  title: "Campaigns",
};

interface CampaignsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

const CampaignsPage = async ({ params: paramsProps }: CampaignsPageProps) => {
  const params = await paramsProps;
  const t = await getTranslate();

  const { isBilling, environment, isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isBilling) {
    return redirect(`/environments/${params.environmentId}/settings/billing`);
  }

  const isCampaignEnabled = await isCampaignEnabledForEnvironment(params.environmentId);
  if (!isCampaignEnabled) {
    return (
      <PageContentWrapper>
        <PageHeader pageTitle={t("common.campaigns")} />
        <div className="flex h-96 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <MegaphoneIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Campaigns Unavailable</h3>
            <p className="mt-2 text-sm text-slate-500">
              Campaign management is not enabled for your organization. Please contact your administrator.
            </p>
          </div>
        </div>
      </PageContentWrapper>
    );
  }

  const [campaigns, surveys, segments] = await Promise.all([
    getCampaignsByEnvironmentId(params.environmentId),
    getSurveys(params.environmentId),
    getSegments(params.environmentId),
  ]);

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.campaigns")} />
      <CampaignList
        environmentId={environment.id}
        initialCampaigns={campaigns}
        surveys={surveys.map((s) => ({ id: s.id, name: s.name }))}
        segments={segments.map((s) => ({ id: s.id, title: s.title }))}
        isReadOnly={isReadOnly}
      />
    </PageContentWrapper>
  );
};

export default CampaignsPage;
