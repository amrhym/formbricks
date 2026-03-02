import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCampaignsByEnvironmentId } from "@/lib/campaign/service";
import { getChannelsByEnvironmentId } from "@/lib/channel/service";
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

  const [campaigns, surveys, segments, channels] = await Promise.all([
    getCampaignsByEnvironmentId(params.environmentId),
    getSurveys(params.environmentId),
    getSegments(params.environmentId),
    getChannelsByEnvironmentId(params.environmentId),
  ]);

  const emailChannels = channels.filter((c) => c.type === "email");

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.campaigns")} />
      <CampaignList
        environmentId={environment.id}
        initialCampaigns={campaigns}
        surveys={surveys.map((s) => ({ id: s.id, name: s.name }))}
        segments={segments.map((s) => ({ id: s.id, title: s.title }))}
        emailChannels={emailChannels.map((c) => ({ id: c.id, name: c.name }))}
        isReadOnly={isReadOnly}
      />
    </PageContentWrapper>
  );
};

export default CampaignsPage;
