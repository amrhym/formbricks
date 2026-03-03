import { redirect } from "next/navigation";
import { TIntegrationNovu } from "@hivecfm/types/integration/novu";
import { WEBAPP_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { NovuWrapper } from "./components/NovuWrapper";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;

  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  const novuIntegration = await getIntegrationByType(params.environmentId, "novu");

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="Novu Integration" />
      <div className="h-[75vh] w-full">
        <NovuWrapper
          environmentId={params.environmentId}
          novuIntegration={novuIntegration as TIntegrationNovu | null}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
