import { redirect } from "next/navigation";
import { TIntegrationStorage } from "@hivecfm/types/integration/storage";
import { WEBAPP_URL } from "@/lib/constants";
import { getIntegrationByType } from "@/lib/integration/service";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { StorageWrapper } from "./components/StorageWrapper";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;

  const { isReadOnly } = await getEnvironmentAuth(params.environmentId);

  if (isReadOnly) {
    return redirect("./");
  }

  const storageIntegration = await getIntegrationByType(params.environmentId, "storage");

  return (
    <PageContentWrapper>
      <GoBackButton url={`${WEBAPP_URL}/environments/${params.environmentId}/workspace/integrations`} />
      <PageHeader pageTitle="Storage Integration" />
      <div className="h-[75vh] w-full">
        <StorageWrapper
          environmentId={params.environmentId}
          storageIntegration={storageIntegration as TIntegrationStorage | null}
        />
      </div>
    </PageContentWrapper>
  );
};

export default Page;
