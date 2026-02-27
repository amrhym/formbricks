import { Metadata } from "next";
import { prisma } from "@hivecfm/database";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { ChannelList } from "./components/channel-list";

export const metadata: Metadata = {
  title: "Channels",
};

interface ChannelsPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export const ChannelsPage = async ({ params: paramsProps }: ChannelsPageProps) => {
  const params = await paramsProps;
  const t = await getTranslate();
  const { environment, isReadOnly } = await getEnvironmentAuth(params.environmentId);

  const channels = await prisma.channel.findMany({
    where: { environmentId: environment.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.channels") || "Channels"} />
      <ChannelList channels={channels} environmentId={environment.id} isReadOnly={isReadOnly} />
    </PageContentWrapper>
  );
};
