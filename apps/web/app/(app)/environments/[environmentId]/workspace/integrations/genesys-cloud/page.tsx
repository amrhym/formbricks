import { redirect } from "next/navigation";
import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { WEBAPP_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { GenesysCloudWrapper } from "./components/GenesysCloudWrapper";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;

  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  const genesysCloudIntegration = await getIntegrationByType(params.environmentId, "genesysCloud");

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="Genesys Cloud Integration" />
      <div className="h-[75vh] w-full">
        <GenesysCloudWrapper
          environmentId={params.environmentId}
          genesysCloudIntegration={genesysCloudIntegration as TIntegrationGenesysCloud | null}
          webappUrl={WEBAPP_URL}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
