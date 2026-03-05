import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCampaignWithSends } from "@/lib/campaign/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { CampaignDetail } from "./components/campaign-detail";

export const metadata: Metadata = {
  title: "Campaign Detail",
};

interface CampaignDetailPageProps {
  params: Promise<{
    environmentId: string;
    campaignId: string;
  }>;
}

const CampaignDetailPage = async ({ params: paramsProps }: CampaignDetailPageProps) => {
  const params = await paramsProps;

  const { isBilling } = await getEnvironmentAuth(params.environmentId);

  if (isBilling) {
    return redirect(`/environments/${params.environmentId}/settings/billing`);
  }

  const campaign = await getCampaignWithSends(params.campaignId);

  return (
    <PageContentWrapper>
      <GoBackButton url={`/environments/${params.environmentId}/campaigns`} />
      <PageHeader pageTitle={campaign.name} />
      <CampaignDetail campaign={campaign} />
    </PageContentWrapper>
  );
};

export default CampaignDetailPage;
