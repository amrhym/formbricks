import { redirect } from "next/navigation";
import { TIntegrationSuperset } from "@hivecfm/types/integration/superset";
import { WEBAPP_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { SupersetIntegrationWrapper } from "./components/SupersetIntegrationWrapper";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;

  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  const supersetIntegration = await getIntegrationByType(params.environmentId, "superset");

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="Superset Integration" />
      <div className="h-[75vh] w-full">
        <SupersetIntegrationWrapper
          environmentId={params.environmentId}
          supersetIntegration={supersetIntegration as TIntegrationSuperset | null}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
