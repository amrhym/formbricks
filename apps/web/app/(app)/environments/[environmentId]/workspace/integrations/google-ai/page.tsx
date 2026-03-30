import { getServerSession } from "next-auth";
import { getIntegrationByType } from "@/lib/integration/service";
import { authOptions } from "@/modules/auth/lib/authOptions";
import { GoBackButton } from "@/modules/ui/components/go-back-button";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { GoogleAiWrapper } from "./components/GoogleAiWrapper";

const Page = async ({ params }: { params: Promise<{ environmentId: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const { environmentId } = await params;
  const integration = await getIntegrationByType(environmentId, "googleAi" as any);

  return (
    <PageContentWrapper>
      <GoBackButton />
      <PageHeader pageTitle="Google AI Integration" />
      <GoogleAiWrapper environmentId={environmentId} integration={integration} />
    </PageContentWrapper>
  );
};

export default Page;
