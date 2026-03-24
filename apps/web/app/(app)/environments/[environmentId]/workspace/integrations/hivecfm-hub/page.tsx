import { redirect } from "next/navigation";
import { TIntegrationHivecfmHub } from "@hivecfm/types/integration/hivecfm-hub";
import { WEBAPP_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { HubIntegrationWrapper } from "./components/HubIntegrationWrapper";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;

  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  const hubIntegration = await getIntegrationByType(params.environmentId, "hivecfmHub");

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="HiveCFM Hub Integration" />
      <div className="h-[75vh] w-full">
        <HubIntegrationWrapper
          environmentId={params.environmentId}
          hubIntegration={hubIntegration as TIntegrationHivecfmHub | null}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
